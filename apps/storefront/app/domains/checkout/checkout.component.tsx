import React, { useState } from "react";
import { Form, useNavigation, Link } from "@remix-run/react";
import { ActiveOrder } from "../catalog/catalog.queries";
import { ShippingMethod } from "./checkout.queries";

interface CheckoutComponentProps {
  activeOrder: ActiveOrder | null;
  shippingMethods: ShippingMethod[];
  actionData?: { error?: string; success?: boolean; orderCode?: string };
}

export function CheckoutComponent({ activeOrder, shippingMethods, actionData }: CheckoutComponentProps) {
  const navigation = useNavigation();
  const [selectedMethod, setSelectedMethod] = useState<string>(
    shippingMethods.length > 0 ? shippingMethods[0].id : ""
  );

  const isSubmitting = navigation.state !== "idle";

  if (actionData?.success) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 text-center">
        <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] block mb-4">
          AURA Order Confirmation
        </span>
        <h1 className="font-serif text-3xl font-light text-zinc-900 mb-6 uppercase">
          Thank you for your order
        </h1>
        <p className="text-zinc-500 text-xs mb-4 uppercase tracking-wider">
          Order Code: <span className="font-bold text-zinc-900">{actionData.orderCode}</span>
        </p>
        <p className="text-zinc-500 text-xs mb-8 uppercase tracking-wider max-w-sm mx-auto leading-relaxed">
          A confirmation email has been sent. Your architectural garments are preparing for dispatch.
        </p>
        <Link
          to="/"
          className="inline-block bg-zinc-950 text-white text-xs tracking-[0.2em] uppercase font-semibold px-8 py-4 hover:bg-zinc-900 transition-colors duration-300 rounded-none"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  if (!activeOrder || activeOrder.lines.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 text-center">
        <h1 className="font-serif text-2xl font-light text-zinc-900 mb-6 uppercase">
          No active order to checkout
        </h1>
        <Link
          to="/"
          className="inline-block bg-zinc-950 text-white text-xs tracking-[0.2em] uppercase font-semibold px-8 py-4 hover:bg-zinc-900 transition-colors duration-300 rounded-none"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12">
      <h1 className="font-serif text-3xl font-light text-zinc-900 mb-12 uppercase tracking-wide">
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Checkout Form */}
        <div className="lg:col-span-7">
          <Form method="post" className="space-y-8">
            {/* Customer Contact */}
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-light text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-2">
                1. Contact Information
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="email" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none placeholder-zinc-300"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-light text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-2">
                2. Shipping Address
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    required
                    className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    required
                    className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="street" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="street"
                  id="street"
                  required
                  className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label htmlFor="city" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    required
                    className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none"
                  />
                </div>
                <div>
                  <label htmlFor="postalCode" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    id="postalCode"
                    required
                    className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="countryCode" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                  Country Code (2 Letters)
                </label>
                <input
                  type="text"
                  name="countryCode"
                  id="countryCode"
                  defaultValue="US"
                  required
                  maxLength={2}
                  className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>
            </div>

            {/* Shipping Delivery Method */}
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-light text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-2">
                3. Delivery Method
              </h2>
              {shippingMethods.length === 0 ? (
                <p className="text-zinc-400 text-xs">No delivery options available.</p>
              ) : (
                <div className="space-y-2">
                  {shippingMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex justify-between items-center border p-4 cursor-pointer transition-colors duration-200 ${
                        selectedMethod === method.id
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 bg-white hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-x-3">
                        <input
                          type="radio"
                          name="shippingMethodId"
                          value={method.id}
                          checked={selectedMethod === method.id}
                          onChange={() => setSelectedMethod(method.id)}
                          className="accent-zinc-950"
                        />
                        <div className="text-left">
                          <span className="text-xs font-semibold uppercase block">{method.name}</span>
                          <span className="text-[10px] text-zinc-400 uppercase">{method.description}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold">${(method.price / 100).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Card details mock inputs */}
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-light text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-2">
                4. Payment Details
              </h2>
              <div>
                <label htmlFor="cardNumber" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  id="cardNumber"
                  required
                  maxLength={16}
                  placeholder="0000 0000 0000 0000"
                  className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none placeholder-zinc-300"
                />
              </div>
            </div>

            {actionData?.error && (
              <p className="text-red-500 text-xxs tracking-wider uppercase">{actionData.error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-zinc-950 text-white text-xs tracking-[0.2em] uppercase font-semibold py-4 hover:bg-zinc-900 transition-colors duration-300 rounded-none disabled:bg-zinc-300"
            >
              {isSubmitting ? "Completing Transaction..." : "Complete Order"}
            </button>
          </Form>
        </div>

        {/* Order Details Column */}
        <div className="lg:col-span-5 bg-zinc-50 p-6 border border-zinc-100 divide-y divide-zinc-200">
          <div className="pb-6">
            <h2 className="font-serif text-lg font-light text-zinc-900 uppercase tracking-wider mb-6">
              Your Order
            </h2>
            <div className="space-y-4">
              {activeOrder.lines.map((line) => (
                <div key={line.id} className="flex justify-between items-center gap-x-4">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-700 font-medium truncate flex-1">
                    {line.productVariant.name} <span className="text-[10px] text-zinc-400">x{line.quantity}</span>
                  </span>
                  <span className="text-xs font-semibold text-zinc-900">
                    ${((line.linePrice * line.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="py-6 space-y-4 text-xs tracking-wider uppercase">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-semibold text-zinc-900">${(activeOrder.subTotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-4 text-sm">
              <span className="font-medium text-zinc-900">Total</span>
              <span className="font-bold text-zinc-900">${(activeOrder.total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
