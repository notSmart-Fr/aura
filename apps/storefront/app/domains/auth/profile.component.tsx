import React from "react";
import { Form } from "@remix-run/react";
import { CustomerData } from "./auth.queries";

interface ProfileComponentProps {
  customer: CustomerData;
}

export function ProfileComponent({ customer }: ProfileComponentProps) {
  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-200 pb-8 mb-12 gap-y-4">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] block mb-2">
            AURA Customer Profile
          </span>
          <h1 className="font-serif text-3xl font-light text-zinc-900 uppercase">
            Welcome, {customer.firstName || "Customer"}
          </h1>
        </div>
        <Form method="post">
          <button
            type="submit"
            className="border border-zinc-950 text-zinc-950 text-[10px] tracking-[0.2em] uppercase font-semibold px-6 py-3 hover:bg-zinc-950 hover:text-white transition-all duration-300 rounded-none"
          >
            Logout
          </button>
        </Form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Contact Info & Addresses */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-zinc-50 p-6 border border-zinc-100 space-y-4">
            <h2 className="font-serif text-base uppercase tracking-wider text-zinc-900 font-medium">
              Account Details
            </h2>
            <div className="text-xs space-y-1 text-zinc-600">
              <p className="uppercase"><span className="text-zinc-400">Name:</span> {customer.firstName} {customer.lastName}</p>
              <p><span className="text-zinc-400 uppercase">Email:</span> {customer.emailAddress}</p>
            </div>
          </div>

          <div className="bg-zinc-50 p-6 border border-zinc-100 space-y-4">
            <h2 className="font-serif text-base uppercase tracking-wider text-zinc-900 font-medium">
              Address Book
            </h2>
            {customer.addresses.length === 0 ? (
              <p className="text-zinc-400 text-xs uppercase tracking-wider">No addresses on file.</p>
            ) : (
              <div className="space-y-4 divide-y divide-zinc-200">
                {customer.addresses.map((address) => (
                  <div key={address.id} className="text-xs text-zinc-600 space-y-1 pt-4 first:pt-0 first:divide-y-0">
                    <p className="font-bold text-zinc-800 uppercase">{address.fullName}</p>
                    <p className="uppercase">{address.streetLine1}</p>
                    <p className="uppercase">
                      {address.city}, {address.postalCode} {address.countryCode}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order History */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="font-serif text-xl font-light text-zinc-900 uppercase tracking-wider border-b border-zinc-200 pb-2">
            Order History
          </h2>
          {!customer.orders?.items || customer.orders.items.length === 0 ? (
            <p className="text-zinc-400 text-xs uppercase tracking-wider py-8">
              You have not placed any orders yet.
            </p>
          ) : (
            <div className="space-y-6 divide-y divide-zinc-200">
              {customer.orders.items.map((order) => (
                <div key={order.id} className="pt-6 first:pt-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="font-sans text-xs font-bold text-zinc-900 tracking-wide uppercase">
                        Order #{order.code}
                      </span>
                      <span className="text-[10px] text-zinc-400 block uppercase mt-1">
                        Placed on {order.orderPlacedAt ? new Date(order.orderPlacedAt).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-900 block">
                        ${(order.total / 100).toFixed(2)}
                      </span>
                      <span className="inline-block text-[9px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-800 px-2 py-0.5 mt-1">
                        {order.state}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 pl-4 border-l border-zinc-200">
                    {order.lines.map((line) => (
                      <div key={line.id} className="text-xs text-zinc-500 uppercase">
                        {line.productVariant.name} <span className="text-[10px] text-zinc-400">x{line.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
