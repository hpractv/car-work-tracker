import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById } from "~/models/car.server";
import {
  getMaintenanceRecord,
  deleteMaintenanceRecord,
} from "~/models/maintenance.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const record = await getMaintenanceRecord(params.recordId!, params.carId!);
  if (!record) throw new Response("Not Found", { status: 404 });

  return json({ car, record });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const car = await getCarById(carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  await deleteMaintenanceRecord(params.recordId!, carId);
  return redirect(`/cars/${carId}`);
}

export default function DeleteMaintenance() {
  const { car, record } = useLoaderData<typeof loader>();
  const dateStr = new Date(record.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const typeLabel = record.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ maxWidth: "500px" }}>
      <div className="card" style={{ borderLeft: "4px solid #dc2626" }}>
        <h1>Delete Maintenance Record</h1>
        <p className="mt-2">
          Are you sure you want to delete the{" "}
          <strong>{typeLabel}</strong> record from <strong>{dateStr}</strong> for{" "}
          {car.year} {car.make} {car.model}?
        </p>
        <div className="flex gap-sm mt-3">
          <Form method="post">
            <button type="submit" className="btn btn-danger">
              Yes, Delete
            </button>
          </Form>
          <a href={`/cars/${car.id}`} className="btn btn-secondary">
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
