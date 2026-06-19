import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import { fetchActiveOrder } from "../domains/catalog/catalog.queries";
import {
  getEligibleShippingMethods,
  setCustomerForOrder,
  setOrderShippingAddress,
  setOrderShippingMethod,
  transitionOrderToState,
  addPaymentToOrder,
} from "../domains/checkout/checkout.queries";
import { CheckoutComponent } from "../domains/checkout/checkout.component";
import { Layout } from "../domains/common/layout.component";
import { getSessionToken } from "../domains/common/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const activeOrder = await fetchActiveOrder(sessionToken);
  const shippingMethods = await getEligibleShippingMethods(sessionToken);

  return json({
    activeOrder,
    shippingMethods,
    cartCount: activeOrder?.totalQuantity || 0,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const sessionToken = await getSessionToken(request);
  const formData = await request.formData();

  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const street = formData.get("street") as string;
  const city = formData.get("city") as string;
  const postalCode = formData.get("postalCode") as string;
  const countryCode = formData.get("countryCode") as string;
  const shippingMethodId = formData.get("shippingMethodId") as string;

  // 1. Set Customer Info
  const customerRes = await setCustomerForOrder(
    { emailAddress: email, firstName, lastName },
    sessionToken
  );
  if (customerRes.errorCode) {
    return json({ error: `Customer step failed: ${customerRes.message}` }, { status: 400 });
  }

  // 2. Set Shipping Address
  const addressRes = await setOrderShippingAddress(
    {
      fullName: `${firstName} ${lastName}`,
      streetLine1: street,
      city,
      postalCode,
      countryCode,
    },
    sessionToken
  );
  if (addressRes.errorCode) {
    return json({ error: `Address step failed: ${addressRes.message}` }, { status: 400 });
  }

  // 3. Set Shipping Method
  if (shippingMethodId) {
    const shippingRes = await setOrderShippingMethod(shippingMethodId, sessionToken);
    if (shippingRes.errorCode) {
      return json({ error: `Shipping method step failed: ${shippingRes.message}` }, { status: 400 });
    }
  }

  // 4. Transition State to ArrangingPayment
  const transitionRes = await transitionOrderToState("ArrangingPayment", sessionToken);
  if (transitionRes.errorCode) {
    return json({ error: `Transition step failed: ${transitionRes.message}` }, { status: 400 });
  }

  // 5. Add Dummy Payment
  const paymentRes = await addPaymentToOrder(
    {
      method: "dummy-payment-handler",
      metadata: {},
    },
    sessionToken
  );
  if (paymentRes.errorCode) {
    return json({ error: `Payment step failed: ${paymentRes.message}` }, { status: 400 });
  }

  return json({
    success: true,
    orderCode: paymentRes.code,
  });
}

export default function CheckoutRoute() {
  const { activeOrder, shippingMethods, cartCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Layout cartCount={cartCount}>
      <CheckoutComponent
        activeOrder={activeOrder}
        shippingMethods={shippingMethods}
        actionData={actionData}
      />
    </Layout>
  );
}
