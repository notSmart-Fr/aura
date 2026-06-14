import React from "react"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface ProductGridBlockProps {
  data: {
    editorialTitle?: string
    editorialText?: string
    editorialLink?: string
    editorialLinkText?: string
  }
  locale: string
}

export async function ProductGridBlock({ data, locale }: ProductGridBlockProps) {
  // CRITICAL: Resolve countryCode -> region_id before calling Medusa
  const region = await getRegion(locale)
  if (!region) {
    return null
  }

  // Fetch catalog products from Medusa
  const productsResponse = await listProducts({ countryCode: locale })
  const products = productsResponse?.response?.products || []

  const editorialTitle = data.editorialTitle || "The Essential Wardrobe"
  const editorialText = data.editorialText || "A collection of foundation pieces designed to endure."
  const editorialLink = data.editorialLink || "/store"
  const editorialLinkText = data.editorialLinkText || "SHOP ALL ESSENTIALS"

  return (
    <section className="w-full border-t border-b border-primary mb-stack-xl bg-white">
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-primary">
        {products.slice(0, 3).map((product) => (
          <div
            key={product.id}
            className="p-stack-md hover:bg-zinc-50 transition-colors group cursor-pointer bg-white"
          >
            <ProductPreview product={product} region={region} isFeatured />
          </div>
        ))}

        {/* Fallbacks if catalogue has fewer than 3 items */}
        {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
          <div
            key={`fallback-p-${i}`}
            className="p-stack-md bg-white flex items-center justify-center text-zinc-400 font-light min-h-[350px]"
          >
            Coming Soon
          </div>
        ))}

        {/* Editorial block */}
        <div className="p-stack-md bg-primary text-white flex flex-col justify-end min-h-[350px]">
          <p className="font-display-lg text-[32px] mb-stack-sm leading-tight text-white">
            {editorialTitle}
          </p>
          <p className="font-body-md text-white/70 mb-stack-md">
            {editorialText}
          </p>
          <LocalizedClientLink
            href={editorialLink}
            className="font-label-lg uppercase border-b border-white w-fit pb-1 hover:opacity-50 transition-opacity text-white"
          >
            {editorialLinkText}
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}
