import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { sessionStorage } from "~/session.server";
import { verifyLogin } from "~/models/user.server";

export const authenticator = new Authenticator<string>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    if (!email || !password) throw new Error("Email and password are required");
    const user = await verifyLogin(email, password);
    if (!user) throw new Error("Invalid email or password");
    return user.id;
  }),
  "user-pass"
);
