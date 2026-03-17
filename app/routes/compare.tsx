import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, Form } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { db } from "~/db.server";
import { getCarsForUser, getFuelLogs } from "~/models/car.server";
import {
  getBatchMaintenanceHealthScores,
  getBatchMaintenanceDue,
} from "~/models/maintenance.server";
import {
  formatCurrency,
  formatDate,
  formatMileage,
  formatMaintenanceType,
} from "~/utils/format";

export function meta() {
  return [{ title: "Compare Cars — Car Work Tracker" }];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparedCar {
  id: string;
  year: number;
  make: string;
  model: string;
  color: string | null;
  vin: string | null;
  currentMileage: number;
  purchaseCost: number | null;
  imageUrl: string | null;
  totalMaintenanceCost: number;
  totalRecords: number;
  lastServiceDate: Date | null;
  healthScore: number | null;
  dueItems: Array<{ type: string; reason: string }>;
  avgMpg: number | null;
  totalFuelCost: number;
  carAge: number;
  costPerMile: number | null;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const carsParam = url.searchParams.get("cars") ?? "";

  // All user cars always loaded (for the selection form)
  const allCars = await getCarsForUser(userId);

  const selectedIds = carsParam
    ? carsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (selectedIds.length === 0) {
    return json({ allCars, selectedIds, comparedCars: [] });
  }

  // Validate that all requested cars belong to this user
  const userCarIds = new Set(allCars.map((c) => c.id));
  const validIds = selectedIds.filter((id) => userCarIds.has(id));

  // Load cars for comparison
  const cars = allCars.filter((c) => validIds.includes(c.id));
  const carsForBatch = cars.map((c) => ({
    id: c.id,
    currentMileage: c.currentMileage,
  }));

  // Parallel data fetch
  const [healthScores, dueMap, maintenanceRecords] = await Promise.all([
    getBatchMaintenanceHealthScores(carsForBatch),
    getBatchMaintenanceDue(carsForBatch),
    db.maintenanceRecord.findMany({
      where: { carId: { in: validIds } },
      orderBy: { date: "desc" },
    }),
  ]);

  // Fuel logs — fetched per car (getFuelLogs only takes a single carId)
  const fuelLogsByCarId = new Map(
    await Promise.all(
      validIds.map(async (id) => [id, await getFuelLogs(id)] as const)
    )
  );

  const currentYear = new Date().getFullYear();

  const comparedCars: ComparedCar[] = cars.map((car) => {
    const carRecords = maintenanceRecords.filter((r) => r.carId === car.id);

    const totalMaintenanceCost = carRecords.reduce(
      (sum, r) => sum + (r.cost ?? 0),
      0
    );
    const totalRecords = carRecords.length;
    const lastServiceDate = carRecords.length > 0 ? carRecords[0].date : null;

    const healthScore = healthScores.get(car.id) ?? null;
    const dueItems = dueMap.get(car.id) ?? [];

    // Fuel stats — same MPG algorithm as reports page
    const fuelLogs = fuelLogsByCarId.get(car.id) ?? [];
    const totalFuelCost = fuelLogs.reduce(
      (sum, l) => sum + (l.totalCost ?? 0),
      0
    );
    const fullTankLogs = [...fuelLogs]
      .filter((l) => l.fullTank)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    const mpgValues: number[] = [];
    for (let i = 1; i < fullTankLogs.length; i++) {
      const diff = fullTankLogs[i].mileage - fullTankLogs[i - 1].mileage;
      if (diff > 0 && fullTankLogs[i].gallons > 0) {
        mpgValues.push(diff / fullTankLogs[i].gallons);
      }
    }
    const avgMpg =
      mpgValues.length > 0
        ? mpgValues.reduce((s, v) => s + v, 0) / mpgValues.length
        : null;

    const carAge = currentYear - car.year;
    const costPerMile =
      car.currentMileage > 0
        ? totalMaintenanceCost / car.currentMileage
        : null;

    return {
      id: car.id,
      year: car.year,
      make: car.make,
      model: car.model,
      color: car.color ?? null,
      vin: car.vin ?? null,
      currentMileage: car.currentMileage,
      purchaseCost: car.purchaseCost ?? null,
      imageUrl: car.imageUrl ?? null,
      totalMaintenanceCost,
      totalRecords,
      lastServiceDate,
      healthScore,
      dueItems,
      avgMpg,
      totalFuelCost,
      carAge,
      costPerMile,
    };
  });

  return json({ allCars, selectedIds: validIds, comparedCars });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function healthColor(score: number | null): string {
  if (score === null) return "text-gray-500";
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-500";
  return "text-red-600";
}

function healthBg(score: number | null): string {
  if (score === null) return "";
  if (score >= 90) return "bg-green-50";
  if (score >= 70) return "bg-yellow-50";
  if (score >= 50) return "bg-orange-50";
  return "bg-red-50";
}

/** Returns the index of the "best" value, or -1 if no clear winner. */
function bestIndex(
  values: Array<number | null>,
  higherIsBetter: boolean
): number {
  const defined = values.filter((v): v is number => v !== null);
  if (defined.length < 2) return -1;
  const target = higherIsBetter ? Math.max(...defined) : Math.min(...defined);
  const idx = values.findIndex((v) => v === target);
  // Ensure it's unique
  return values.filter((v) => v === target).length === 1 ? idx : -1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComparePage() {
  const { allCars, selectedIds, comparedCars } =
    useLoaderData<typeof loader>();

  const hasComparison = comparedCars.length >= 2;
  const hasDueItems = comparedCars.some((c) => c.dueItems.length > 0);

  // ── Metric rows for comparison table ──────────────────────────────────────
  type Row =
    | { kind: "numeric"; label: string; values: Array<number | null>; format: (v: number) => string; higherIsBetter: boolean }
    | { kind: "text"; label: string; values: Array<string | null> };

  const rows: Row[] = comparedCars.length > 0
    ? [
        { kind: "text", label: "Year", values: comparedCars.map((c) => String(c.year)) },
        { kind: "text", label: "Make", values: comparedCars.map((c) => c.make) },
        { kind: "text", label: "Model", values: comparedCars.map((c) => c.model) },
        { kind: "text", label: "Color", values: comparedCars.map((c) => c.color) },
        { kind: "text", label: "VIN", values: comparedCars.map((c) => c.vin) },
        {
          kind: "numeric",
          label: "Current Mileage",
          values: comparedCars.map((c) => c.currentMileage),
          format: (v) => formatMileage(v),
          higherIsBetter: false,
        },
        {
          kind: "numeric",
          label: "Health Score",
          values: comparedCars.map((c) => c.healthScore),
          format: (v) => `${v}/100`,
          higherIsBetter: true,
        },
        {
          kind: "numeric",
          label: "Due Maintenance",
          values: comparedCars.map((c) => c.dueItems.length),
          format: (v) => `${v} item${v !== 1 ? "s" : ""}`,
          higherIsBetter: false,
        },
        {
          kind: "numeric",
          label: "Total Records",
          values: comparedCars.map((c) => c.totalRecords),
          format: (v) => String(v),
          higherIsBetter: true,
        },
        {
          kind: "text",
          label: "Last Service",
          values: comparedCars.map((c) =>
            c.lastServiceDate ? formatDate(c.lastServiceDate) : null
          ),
        },
        {
          kind: "numeric",
          label: "Total Maint. Cost",
          values: comparedCars.map((c) => c.totalMaintenanceCost),
          format: (v) => formatCurrency(v),
          higherIsBetter: false,
        },
        {
          kind: "numeric",
          label: "Cost / Mile",
          values: comparedCars.map((c) => c.costPerMile),
          format: (v) => `$${v.toFixed(3)}`,
          higherIsBetter: false,
        },
        {
          kind: "numeric",
          label: "Total Fuel Cost",
          values: comparedCars.map((c) => c.totalFuelCost),
          format: (v) => formatCurrency(v),
          higherIsBetter: false,
        },
        {
          kind: "numeric",
          label: "Avg MPG",
          values: comparedCars.map((c) => c.avgMpg),
          format: (v) => `${v.toFixed(1)} mpg`,
          higherIsBetter: true,
        },
        {
          kind: "numeric",
          label: "Car Age",
          values: comparedCars.map((c) => c.carAge),
          format: (v) => `${v} yr${v !== 1 ? "s" : ""}`,
          higherIsBetter: false,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 Compare Cars</h1>
            <p className="mt-1 text-sm text-gray-500">
              Select up to 3 cars to compare side-by-side
            </p>
          </div>
          <Link
            to="/cars"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            ← Back to Cars
          </Link>
        </div>

        {/* Car Selection Form */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Select Cars to Compare
          </h2>

          {allCars.length === 0 ? (
            <div className="rounded-lg bg-gray-50 py-10 text-center text-gray-500">
              <p className="text-lg font-medium">No cars found</p>
              <p className="mt-1 text-sm">
                <Link to="/cars/new" className="text-blue-600 hover:underline">
                  Add your first car
                </Link>{" "}
                to get started.
              </p>
            </div>
          ) : (
            <Form method="get" action="/compare">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allCars.map((car) => {
                  const checked = selectedIds.includes(car.id);
                  return (
                    <label
                      key={car.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        checked
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="carCheck"
                        value={car.id}
                        defaultChecked={checked}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        onChange={(e) => {
                          const form = e.currentTarget.form!;
                          const checked = Array.from(
                            form.querySelectorAll<HTMLInputElement>(
                              'input[name="carCheck"]:checked'
                            )
                          );
                          // Enforce max 3
                          if (checked.length > 3) {
                            e.currentTarget.checked = false;
                          }
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {car.year} {car.make} {car.model}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatMileage(car.currentMileage)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Hidden field to build the `cars` query param via JS; fallback via server */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget.form!;
                    const checked = Array.from(
                      form.querySelectorAll<HTMLInputElement>(
                        'input[name="carCheck"]:checked'
                      )
                    ).map((el) => el.value);
                    const params = new URLSearchParams();
                    if (checked.length > 0) {
                      params.set("cars", checked.join(","));
                    }
                    window.location.href = `/compare?${params.toString()}`;
                  }}
                  className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Compare Selected Cars
                </button>
                {selectedIds.length > 0 && (
                  <Link
                    to="/compare"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear selection
                  </Link>
                )}
              </div>
            </Form>
          )}
        </div>

        {/* Single car info (not enough for full table) */}
        {comparedCars.length === 1 && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            Select at least 2 cars to see the side-by-side comparison table.
          </div>
        )}

        {/* Comparison Table */}
        {hasComparison && (
          <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Side-by-Side Comparison
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-40" />
                  {comparedCars.map((c) => (
                    <col key={c.id} />
                  ))}
                </colgroup>

                {/* Car header row */}
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Metric
                    </th>
                    {comparedCars.map((car) => (
                      <th
                        key={car.id}
                        className="px-4 py-3 text-left font-semibold text-gray-900"
                      >
                        <Link
                          to={`/cars/${car.id}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {car.year} {car.make} {car.model}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, rowIdx) => {
                    const best =
                      row.kind === "numeric"
                        ? bestIndex(row.values, row.higherIsBetter)
                        : -1;

                    return (
                      <tr
                        key={row.label}
                        className={`border-b border-gray-50 ${
                          rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-600">
                          {row.label}
                        </td>

                        {comparedCars.map((car, colIdx) => {
                          const isBest = best === colIdx;
                          const isHealthRow = row.label === "Health Score";

                          let cellContent: React.ReactNode;

                          if (row.kind === "text") {
                            const val = row.values[colIdx];
                            cellContent = (
                              <span className="text-gray-900">
                                {val ?? <span className="text-gray-400">N/A</span>}
                              </span>
                            );
                          } else {
                            const val = row.values[colIdx];
                            if (val === null) {
                              cellContent = (
                                <span className="text-gray-400">N/A</span>
                              );
                            } else if (isHealthRow) {
                              cellContent = (
                                <span
                                  className={`font-semibold ${healthColor(val)}`}
                                >
                                  {row.format(val)}
                                </span>
                              );
                            } else {
                              cellContent = (
                                <span className="text-gray-900">
                                  {row.format(val)}
                                </span>
                              );
                            }
                          }

                          const bgClass =
                            isBest && row.label !== "Health Score"
                              ? "bg-green-50"
                              : isHealthRow && row.kind === "numeric"
                              ? healthBg(row.values[colIdx])
                              : isBest
                              ? "bg-green-50"
                              : "";

                          return (
                            <td
                              key={car.id}
                              className={`px-4 py-3 ${bgClass}`}
                            >
                              <div className="flex items-center gap-1.5">
                                {cellContent}
                                {isBest && (
                                  <span
                                    title="Best value"
                                    className="text-green-500"
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Due Maintenance Summary */}
        {hasComparison && hasDueItems && (
          <div className="rounded-xl border border-orange-200 bg-white shadow-sm">
            <div className="border-b border-orange-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-800">
                ⚠️ Due Maintenance Summary
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {comparedCars.map((car) => (
                <div key={car.id} className="p-5">
                  <h3 className="mb-3 font-semibold text-gray-900">
                    {car.year} {car.make} {car.model}
                  </h3>
                  {car.dueItems.length === 0 ? (
                    <p className="text-sm text-green-600">✓ All up to date</p>
                  ) : (
                    <ul className="space-y-2">
                      {car.dueItems.map((item) => (
                        <li key={item.type} className="text-sm">
                          <span className="font-medium text-orange-700">
                            {formatMaintenanceType(item.type)}
                          </span>
                          <p className="text-xs text-gray-500">{item.reason}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No cars selected yet */}
        {selectedIds.length === 0 && allCars.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-5xl">🚗</p>
            <p className="mt-4 text-lg font-medium text-gray-700">
              Select cars above to start comparing
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Choose up to 3 cars to see a side-by-side breakdown
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
