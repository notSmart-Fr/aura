import React from "react";
import { Link, useFetcher } from "@remix-run/react";
import { ActiveOrder } from "../catalog/catalog.queries";

interface CartComponentProps {
  activeOrder: ActiveOrder | null;
}

export function CartComponent({ activeOrder }: CartComponentProps) {
  const fetcher = useFetcher();

  if (!activeOrder || !activeOrder.lines || activeOrder.lines.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 text-center">
        <h1 className="font-serif text-3xl font-light text-zinc-900 mb-6 uppercase">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-zinc-500 text-xs mb-8 uppercase tracking-wider">
          Explore AURA minimal essentials to build your silhouette.
        </p>
        <Link
          to="/store"
          className="inline-block bg-zinc-950 text-white text-xs tracking-[0.2em] uppercase font-semibold px-8 py-4 hover:bg-zinc-900 transition-colors duration-300 rounded-none"
        >
          View Collection
        </Link>
      </div>
    );
  }

  const handleAdjustQuantity = (lineId: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      handleRemove(lineId);
      return;
    }
    const fd = new FormData();
    fd.append("intent", "adjust");
    fd.append("lineId", lineId);
    fd.append("quantity", newQty.toString());
    fetcher.submit(fd, { method: "POST" });
  };

  const handleRemove = (lineId: string) => {
    const fd = new FormData();
    fd.append("intent", "remove");
    fd.append("lineId", lineId);
    fetcher.submit(fd, { method: "POST" });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12">
      <h1 className="font-serif text-3xl font-light text-zinc-900 mb-12 uppercase tracking-wide">
        Shopping Bag
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 divide-y divide-zinc-200">
          {activeOrder.lines.map((line) => (
            <div key={line.id} className="py-6 flex gap-6">
              {/* Product Thumbnail - aspect ratio 3/4 */}
              <div className="w-24 aspect-[3/4] bg-zinc-100 flex-shrink-0 overflow-hidden relative">
                <img
                  src={line.productVariant.featuredAsset?.preview || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=150&auto=format&fit=crop"}
                  alt={line.productVariant.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif text-sm tracking-wider uppercase text-zinc-950 font-medium">
                      {line.productVariant.name}
                    </h3>
                    <span className="text-xs font-semibold text-zinc-900">
                      ${((line.linePrice * line.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">
                    SKU: {line.productVariant.sku}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4">
                  {/* Quantity adjustment */}
                  <div className="flex items-center border border-zinc-200 divide-x divide-zinc-200">
                    <button
                      onClick={() => handleAdjustQuantity(line.id, line.quantity, -1)}
                      className="px-3 py-1.5 text-xs hover:bg-zinc-50"
                    >
                      &minus;
                    </button>
                    <span className="px-4 py-1.5 text-xs font-semibold text-zinc-900">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => handleAdjustQuantity(line.id, line.quantity, 1)}
                      className="px-3 py-1.5 text-xs hover:bg-zinc-50"
                    >
                      &#43;
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(line.id)}
                    className="text-[10px] tracking-wider text-zinc-400 hover:text-zinc-950 uppercase border-b border-zinc-200 hover:border-zinc-950 pb-0.5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-4 bg-zinc-50 p-6 border border-zinc-100">
          <h2 className="font-serif text-lg font-light text-zinc-900 uppercase tracking-wider mb-6 border-b border-zinc-200 pb-4">
            Order Summary
          </h2>

          <div className="space-y-4 text-xs tracking-wider uppercase">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-semibold text-zinc-900">${(activeOrder.subTotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Shipping</span>
              <span className="font-semibold text-zinc-900">
                {activeOrder.shipping > 0 ? `$${(activeOrder.shipping / 100).toFixed(2)}` : "FREE"}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-4 text-sm">
              <span className="font-medium text-zinc-900">Total</span>
              <span className="font-bold text-zinc-900">${(activeOrder.total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/checkout"
              className="w-full inline-block text-center bg-zinc-950 text-white text-xs tracking-[0.2em] uppercase font-semibold py-4 hover:bg-zinc-900 transition-colors duration-300 rounded-none"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
