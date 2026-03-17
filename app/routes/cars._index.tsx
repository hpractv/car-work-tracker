import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { getMaintenanceDue } from "~/models/maintenance.server";
import CarCard from "~/components/CarCard";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);

  const carsWithDue = await Promise.all(
    cars.map(async (car) => {
      const due = await getMaintenanceDue(car.id, car.currentMileage);
      return { car, dueCount: due.length };
    })
  );

  return json({ carsWithDue });
}

export default function CarsIndex() {
  const { carsWithDue } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="page-header">
        <h1>My Cars</h1>
        <Link to="/cars/new" className="btn btn-primary">
          + Add Car
        </Link>
      </div>

      {carsWithDue.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">No cars yet. Add your first one!</p>
          <Link to="/cars/new" className="btn btn-primary mt-2">
            Add Car
          </Link>
        </div>
      ) : (
        <div className="grid">
          {carsWithDue.map(({ car, dueCount }) => (
            <CarCard key={car.id} car={car} dueCount={dueCount} />
          ))}
        </div>
      )}
    </div>
  );
}
