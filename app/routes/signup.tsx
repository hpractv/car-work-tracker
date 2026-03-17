import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { getUserId, createUserSession } from "~/session.server";
import { createUser, getUserByEmail } from "~/models/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const user = await createUser(email, password, name || undefined);
  return createUserSession(user.id, "/");
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="auth-container">
      <div className="card">
        <h1 style={{ marginBottom: "1.5rem" }}>🚗 Create Account</h1>
        {actionData?.error && (
          <div className="alert alert-error mb-2">{actionData.error}</div>
        )}
        <Form method="post">
          <div className="form-group">
            <label htmlFor="name">Name (optional)</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="form-control"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </Form>
        <p className="text-muted text-sm mt-2" style={{ textAlign: "center" }}>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
