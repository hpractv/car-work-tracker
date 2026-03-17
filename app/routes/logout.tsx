import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { destroyUserSession } from "~/session.server";

export async function action({ request }: ActionFunctionArgs) {
  return destroyUserSession(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return destroyUserSession(request);
}
