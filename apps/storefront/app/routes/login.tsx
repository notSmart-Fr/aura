import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import { login, fetchActiveCustomer } from "../domains/auth/auth.queries";
import { fetchActiveOrder } from "../domains/catalog/catalog.queries";
import { AuthComponent } from "../domains/auth/auth.component";
import { Layout } from "../domains/common/layout.component";
import { getSessionToken, createSession } from "../domains/common/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const activeCustomer = await fetchActiveCustomer(sessionToken);

  if (activeCustomer) {
    return redirect("/profile");
  }

  const activeOrder = await fetchActiveOrder(sessionToken);

  return json({
    cartCount: activeOrder?.totalQuantity || 0,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  const result = await login(email, password, sessionToken);

  if (result.login.errorCode) {
    return json({ error: result.login.message }, { status: 400 });
  }

  const headers = new Headers();
  if (result.token) {
    const sessionHeaders = await createSession(request, result.token);
    sessionHeaders.forEach((value, key) => headers.append(key, value));
  }

  return redirect("/profile", { headers });
}

export default function LoginRoute() {
  const { cartCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Layout cartCount={cartCount}>
      <AuthComponent actionData={actionData} />
    </Layout>
  );
}
