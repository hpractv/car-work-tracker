import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById, addCarMember, removeCarMember, updateCarMemberRole } from "~/models/car.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const isOwner = car.members.some((m) => m.userId === userId && m.role === "owner");
  return json({ car, isOwner, currentUserId: userId });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "add") {
    const email = String(formData.get("email") ?? "").trim();
    const role = String(formData.get("role") ?? "driver");
    if (!email) return json({ error: "Email is required" }, { status: 400 });
    try {
      await addCarMember(carId, email, role, userId);
      return redirect(`/cars/${carId}/members`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (intent === "update") {
    const memberId = String(formData.get("memberId") ?? "");
    const newRole = String(formData.get("role") ?? "");
    if (!memberId || !["owner", "driver"].includes(newRole)) {
      return json({ error: "Invalid role" }, { status: 400 });
    }
    try {
      await updateCarMemberRole(carId, memberId, newRole, userId);
      return redirect(`/cars/${carId}/members`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (intent === "remove") {
    const memberId = String(formData.get("memberId") ?? "");
    try {
      await removeCarMember(carId, memberId, userId);
      return redirect(`/cars/${carId}/members`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function CarMembers() {
  const { car, isOwner, currentUserId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ maxWidth: "700px" }}>
      <div className="page-header">
        <h1>Members — {car.year} {car.make} {car.model}</h1>
        <a href={`/cars/${car.id}`} className="btn btn-secondary">← Back</a>
      </div>

      {actionData?.error && (
        <div className="alert alert-error mb-2">{actionData.error}</div>
      )}

      <div className="card">
        <h2>Current Members</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th>{isOwner && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {car.members.map((m) => (
              <tr key={m.id}>
                <td>{m.user.name ?? "—"}</td>
                <td>{m.user.email}</td>
                <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                {isOwner && (
                  <td>
                    {m.userId !== currentUserId && (
                      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                        <Form method="post" style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                          <input type="hidden" name="intent" value="update" />
                          <input type="hidden" name="memberId" value={m.id} />
                          <select name="role" defaultValue={m.role} className="form-control" style={{ padding: "0.2rem 0.4rem", fontSize: "0.8rem", width: "auto" }}>
                            <option value="owner">Owner</option>
                            <option value="driver">Driver</option>
                          </select>
                          <button type="submit" className="btn btn-secondary btn-sm">Save</button>
                        </Form>
                        <Form method="post" style={{ display: "inline" }}>
                          <input type="hidden" name="intent" value="remove" />
                          <input type="hidden" name="memberId" value={m.id} />
                          <button type="submit" className="btn btn-danger btn-sm" disabled={isSubmitting}>{isSubmitting ? "..." : "Remove"}</button>
                        </Form>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="card">
          <h2>Add Member</h2>
          <Form method="post">
            <input type="hidden" name="intent" value="add" />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="email">User Email</label>
                <input id="email" name="email" type="email" required className="form-control" placeholder="user@example.com" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="role">Role</label>
                <select id="role" name="role" className="form-control">
                  <option value="driver">Driver</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add"}</button>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}
