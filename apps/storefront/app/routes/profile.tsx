import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { fetchActiveCustomer, logout } from "../domains/auth/auth.queries";
import { fetchActiveOrder } from "../domains/catalog/catalog.queries";
import { ProfileComponent } from "../domains/auth/profile.component";
import { Layout } from "../domains/common/layout.component";
import { getSessionToken, destroySession } from "../domains/common/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const customer = await fetchActiveCustomer(sessionToken);

  if (!customer) {
    return redirect("/login");
  }

  const activeOrder = await fetchActiveOrder(sessionToken);

  return json({
    customer,
    cartCount: activeOrder?.totalQuantity || 0,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const sessionToken = await getSessionToken(request);

  // Invoke Vendure logout
  await logout(sessionToken);

  const headers = await destroySession(request);

  return redirect("/login", { headers });
}

export default function ProfileRoute() {
  const { customer, cartCount } = useLoaderData<typeof loader>();

  return (
    <Layout cartCount={cartCount}>
      <ProfileComponent customer={customer} />
    </Layout>
  );
}
