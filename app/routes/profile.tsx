import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getUserById, getUserByEmail, updateUserProfile, updateUserPassword } from "~/models/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const user = await getUserById(userId);
  if (!user) throw redirect("/login");
  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "profile") {
    const name = String(formData.get("name") ?? "").trim() || null;
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      return json({ profileError: "Email is required", passwordError: null, success: null });
    }

    const existing = await getUserByEmail(email);
    if (existing && existing.id !== userId) {
      return json({ profileError: "That email is already in use", passwordError: null, success: null });
    }

    await updateUserProfile(userId, { name, email });
    return json({ profileError: null, passwordError: null, success: "profile" });
  }

  if (intent === "password") {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return json({ profileError: null, passwordError: "All password fields are required", success: null });
    }
    if (newPassword.length < 8) {
      return json({ profileError: null, passwordError: "New password must be at least 8 characters", success: null });
    }
    if (newPassword !== confirmPassword) {
      return json({ profileError: null, passwordError: "New passwords do not match", success: null });
    }

    const result = await updateUserPassword(userId, currentPassword, newPassword);
    if (!result) {
      return json({ profileError: null, passwordError: "Current password is incorrect", success: null });
    }

    return json({ profileError: null, passwordError: null, success: "password" });
  }

  return json({ profileError: null, passwordError: "Unknown action", success: null });
}

export default function Profile() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div style={{ maxWidth: "600px" }}>
      <div className="page-header">
        <h1>Account Settings</h1>
        <a href="/" className="btn btn-secondary">← Dashboard</a>
      </div>

      {/* Profile Update Form */}
      <div className="card">
        <h2>Profile Information</h2>
        {actionData?.profileError && (
          <div className="alert alert-error mb-2">{actionData.profileError}</div>
        )}
        {actionData?.success === "profile" && (
          <div className="alert alert-info mb-2">✓ Profile updated successfully!</div>
        )}
        <Form method="post">
          <input type="hidden" name="intent" value="profile" />
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={user.name ?? ""}
              className="form-control"
              placeholder="Your name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
              className="form-control"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save Profile
          </button>
        </Form>
      </div>

      {/* Password Change Form */}
      <div className="card">
        <h2>Change Password</h2>
        {actionData?.passwordError && (
          <div className="alert alert-error mb-2">{actionData.passwordError}</div>
        )}
        {actionData?.success === "password" && (
          <div className="alert alert-info mb-2">✓ Password changed successfully!</div>
        )}
        <Form method="post">
          <input type="hidden" name="intent" value="password" />
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password *</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password *</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="form-control"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Change Password
          </button>
        </Form>
      </div>
    </div>
  );
}
