import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { fetchActiveOrder } from "../domains/catalog/catalog.queries";
import { adjustOrderLine, removeOrderLine } from "../domains/cart/cart.queries";
import { CartComponent } from "../domains/cart/cart.component";
import { Layout } from "../domains/common/layout.component";
import { getSessionToken } from "../domains/common/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const activeOrder = await fetchActiveOrder(sessionToken);

  return json({
    activeOrder,
    cartCount: activeOrder?.totalQuantity || 0,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const lineId = formData.get("lineId") as string;

  if (!lineId) {
    return json({ error: "Order Line ID is required" }, { status: 400 });
  }

  let result;
  if (intent === "adjust") {
    const quantity = parseInt(formData.get("quantity") as string);
    if (isNaN(quantity) || quantity < 0) {
      return json({ error: "Invalid quantity" }, { status: 400 });
    }
    result = await adjustOrderLine(lineId, quantity, sessionToken);
  } else if (intent === "remove") {
    result = await removeOrderLine(lineId, sessionToken);
  } else {
    return json({ error: "Invalid Action intent" }, { status: 400 });
  }

  if (result.error) {
    return json({ error: result.error }, { status: 400 });
  }

  return json({ success: true });
}

export default function CartRoute() {
  const { activeOrder, cartCount } = useLoaderData<typeof loader>();

  return (
    <Layout cartCount={cartCount}>
      <CartComponent activeOrder={activeOrder} />
    </Layout>
  );
}
