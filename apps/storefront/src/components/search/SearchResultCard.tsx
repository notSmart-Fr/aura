"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface SearchResultProduct {
  product_id: string
  handle: string
  title: string
  distance: number
}

interface SearchResultCardProps {
  product: SearchResultProduct
  onSelect?: () => void
}

export default function SearchResultCard({ product, onSelect }: SearchResultCardProps) {
  // Convert Cosine Distance (0 to 1+) to a similarity percentage (0% to 100%)
  const similarity = Math.max(0, Math.min(100, Math.round((1 - product.distance) * 100)))

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      onClick={onSelect}
      className="block p-4 border border-zinc-200 bg-white hover:border-black transition-colors duration-300 rounded-none group"
    >
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-label-lg text-primary uppercase group-hover:text-black">
            {product.title}
          </h4>
          <span className="font-label-md text-secondary text-[10px] uppercase block mt-1">
            /{product.handle}
          </span>
        </div>
        <div className="text-right">
          <span className="font-label-md text-primary bg-zinc-100 px-2 py-1 text-[10px] tracking-wider uppercase">
            {similarity}% Match
          </span>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
