import React, { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { ProductData } from "./catalog.queries";

interface ProductDetailProps {
  product: ProductData;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const fetcher = useFetcher();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState<string>("");

  // Initialize selected options with the first variant
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const initialVariant = product.variants[0];
      const initialSelection: Record<string, string> = {};
      initialVariant.options.forEach((opt) => {
        initialSelection[opt.group.code] = opt.code;
      });
      setSelectedOptions(initialSelection);
    }
    if (product.featuredAsset?.preview) {
      setActiveImage(product.featuredAsset.preview);
    } else if (product.assets && product.assets.length > 0) {
      setActiveImage(product.assets[0].preview);
    }
  }, [product]);

  // Find variant matching current selection
  const selectedVariant = product.variants.find((v) => {
    return v.options.every((opt) => selectedOptions[opt.group.code] === opt.code);
  });

  const handleOptionChange = (groupCode: string, optionCode: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupCode]: optionCode,
    }));
  };

  const isAdding = fetcher.state !== "idle";

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Left Side: Product Images */}
        <div className="md:col-span-7 space-y-4">
          <div className="relative aspect-[3/4] bg-zinc-100 overflow-hidden">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                No Preview Available
              </div>
            )}
          </div>
          {product.assets && product.assets.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.assets.map((asset, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(asset.preview)}
                  className={`aspect-[3/4] bg-zinc-100 overflow-hidden border ${
                    activeImage === asset.preview ? "border-zinc-900" : "border-transparent"
                  }`}
                >
                  <img
                    src={asset.preview}
                    alt={`${product.name} preview ${i}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Meta & Options Selection */}
        <div className="md:col-span-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-zinc-200 pb-6 mb-6">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-2">
                AURA Collection
              </span>
              <h1 className="font-serif text-3xl font-light text-zinc-900 uppercase mb-2">
                {product.name}
              </h1>
              <p className="text-zinc-500 text-xs leading-relaxed uppercase mb-4">
                SKU: {selectedVariant ? selectedVariant.sku : "N/A"}
              </p>
              <span className="font-sans text-xl font-medium text-zinc-900">
                ${selectedVariant ? (selectedVariant.price / 100).toFixed(2) : "0.00"}
              </span>
            </div>

            <div className="space-y-6">
              <p className="text-xs text-zinc-600 leading-relaxed">
                {product.description}
              </p>

              {/* Options Selection Matrix */}
              {product.optionGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
                    Select {group.name}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedOptions[group.code] === opt.code;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleOptionChange(group.code, opt.code)}
                          className={`border px-4 py-2 text-xs tracking-wider uppercase font-semibold transition-colors duration-200 rounded-none ${
                            isSelected
                              ? "bg-zinc-950 border-zinc-950 text-white"
                              : "bg-white border-zinc-200 text-zinc-800 hover:border-zinc-900"
                          }`}
                        >
                          {opt.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-zinc-200">
            <fetcher.Form method="post">
              <input
                type="hidden"
                name="variantId"
                value={selectedVariant ? selectedVariant.id : ""}
              />
              <button
                type="submit"
                disabled={!selectedVariant || isAdding}
                className="w-full bg-zinc-950 text-white text-xs tracking-[0.2em] uppercase font-semibold py-4 hover:bg-zinc-900 transition-colors duration-300 rounded-none disabled:bg-zinc-300 disabled:cursor-not-allowed"
              >
                {isAdding ? "Adding to Bag..." : "Add to Bag"}
              </button>
            </fetcher.Form>
            {fetcher.data?.error && (
              <p className="text-red-500 text-xxs tracking-wider mt-2 uppercase">
                {fetcher.data.error}
              </p>
            )}
            {fetcher.data?.success && (
              <p className="text-emerald-600 text-xxs tracking-wider mt-2 uppercase">
                Garment added to your shopping bag
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
