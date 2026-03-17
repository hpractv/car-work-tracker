import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { getMaintenanceDue } from "~/models/maintenance.server";
import { getUserById } from "~/models/user.server";
import CarCard from "~/components/CarCard";
import NearbyServicesAlert from "~/components/NearbyServicesAlert";
import InstallPrompt from "~/components/InstallPrompt";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const user = await getUserById(userId);
  const cars = await getCarsForUser(userId);

  const carsWithDue = await Promise.all(
    cars.map(async (car) => {
      const due = await getMaintenanceDue(car.id, car.currentMileage);
      return { car, due };
    })
  );

  return json({ user, carsWithDue });
}

export default function Index() {
  const { user, carsWithDue } = useLoaderData<typeof loader>();

  const allDue = carsWithDue.flatMap((c) => c.due);

  return (
    <div>
      <InstallPrompt />
      <NearbyServicesAlert maintenanceDue={allDue} />

      <div className="page-header">
        <div>
          <h1>Welcome back{user?.name ? `, ${user.name}` : ""}!</h1>
          <p className="text-muted">Here's an overview of your vehicles.</p>
        </div>
        <a href="/cars/new" className="btn btn-primary">
          + Add Car
        </a>
      </div>

      {carsWithDue.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">You have no cars yet.</p>
          <a href="/cars/new" className="btn btn-primary mt-2">
            Add your first car
          </a>
        </div>
      ) : (
        <>
          {allDue.length > 0 && (
            <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h2 style={{ color: "#92400e" }}>⚠️ Maintenance Due</h2>
              {carsWithDue
                .filter((c) => c.due.length > 0)
                .map(({ car, due }) => (
                  <div key={car.id} className="mt-1">
                    <strong>
                      {car.year} {car.make} {car.model}
                    </strong>
                    <ul style={{ margin: "0.35rem 0 0.5rem 1.25rem" }}>
                      {due.map((d) => (
                        <li key={d.type} className="text-sm">
                          <strong>{d.type.replace(/_/g, " ")}</strong>: {d.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}

          <h2>Your Cars</h2>
          <div className="grid">
            {carsWithDue.map(({ car, due }) => (
              <CarCard key={car.id} car={car} dueCount={due.length} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
