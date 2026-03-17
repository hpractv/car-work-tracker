import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById, deleteCar } from "~/models/car.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const isOwner = car.members.some((m) => m.userId === userId && m.role === "owner");
  if (!isOwner) throw new Response("Forbidden", { status: 403 });

  return json({ car });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  try {
    await deleteCar(params.carId!, userId);
    return redirect("/cars");
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 403 });
  }
}

export default function DeleteCar() {
  const { car } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ maxWidth: "500px" }}>
      <div className="card" style={{ borderLeft: "4px solid #dc2626" }}>
        <h1>Delete Car</h1>
        {actionData?.error && (
          <div className="alert alert-error" role="alert">
            {actionData.error}
          </div>
        )}
        <p className="mt-2">
          Are you sure you want to delete{" "}
          <strong>
            {car.year} {car.make} {car.model}
          </strong>
          ? This will permanently delete all maintenance records as well.
        </p>
        <div className="flex gap-sm mt-3">
          <Form method="post">
            <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Yes, Delete"}
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
