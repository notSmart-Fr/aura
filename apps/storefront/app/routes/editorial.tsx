import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { fetchActiveOrder } from "../domains/catalog/catalog.queries";
import { EditorialComponent } from "../domains/editorial/editorial.component";
import { Layout } from "../domains/common/layout.component";
import { getSessionToken } from "../domains/common/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const activeOrder = await fetchActiveOrder(sessionToken);

  return json({
    cartCount: activeOrder?.totalQuantity || 0,
  });
}

export default function EditorialRoute() {
  const { cartCount } = useLoaderData<typeof loader>();

  return (
    <Layout cartCount={cartCount}>
      <EditorialComponent />
    </Layout>
  );
}
