import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { fetchProductBySlug, fetchActiveOrder, addItemToOrder } from "../domains/catalog/catalog.queries";
import { ProductDetail } from "../domains/catalog/product-detail.component";
import { Layout } from "../domains/common/layout.component";
import { getSessionToken, createSession } from "../domains/common/session.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const product = await fetchProductBySlug(slug);
  if (!product) {
    throw new Response("Product Not Found", { status: 404 });
  }

  const sessionToken = await getSessionToken(request);
  const activeOrder = await fetchActiveOrder(sessionToken);

  return json({
    product,
    cartCount: activeOrder?.totalQuantity || 0,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const formData = await request.formData();
  const variantId = formData.get("variantId") as string;

  if (!variantId) {
    return json({ error: "Product Variant ID is required" }, { status: 400 });
  }

  const result = await addItemToOrder(variantId, 1, sessionToken);

  if (result.error) {
    return json({ error: result.error }, { status: 400 });
  }

  const headers = new Headers();
  if (result.token && result.token !== sessionToken) {
    const sessionHeaders = await createSession(request, result.token);
    sessionHeaders.forEach((value, key) => headers.append(key, value));
  }

  return json({ success: true }, { headers });
}

export default function ProductRoute() {
  const { product, cartCount } = useLoaderData<typeof loader>();

  return (
    <Layout cartCount={cartCount}>
      <ProductDetail product={product} />
    </Layout>
  );
}
