import { listRegions } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import type { HeroBanner, Lookbook } from "../../../../payload-types"
import Hero from "@modules/home/components/hero"
import TeaserSection from "@modules/home/components/teasers"
import ProductPreview from "@modules/products/components/product-preview"
import BrandNarrative from "@modules/home/components/brand-narrative"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface HomeTemplateProps {
  products: HttpTypes.StoreProduct[]
  cmsContent?: HeroBanner | null
  teaserContent?: Lookbook | null
  countryCode: string
}

export default async function HomeTemplate({
  products,
  cmsContent,
  teaserContent,
  countryCode,
}: HomeTemplateProps) {
  // Fetch default region internally to avoid polluting the orchestrator's interface
  const regions = await listRegions()
  const region = regions?.[0]

  if (!region) {
    return null
  }

  return (
    <div className="bg-white min-h-screen pt-[100px] flex flex-col">
      {/* Editorial Hero Banner */}
      <Hero data={cmsContent} locale={countryCode} />

      {/* Teaser Images Section */}
      <TeaserSection data={teaserContent} />

      {/* Featured Products Horizontal (Hairline Divided) */}
      <section className="w-full border-t border-b border-primary mb-stack-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-primary">
          {products.slice(0, 3).map((product) => (
            <div
              key={product.id}
              className="p-stack-md hover:bg-zinc-50 transition-colors group cursor-pointer bg-white"
            >
              <ProductPreview product={product} region={region} isFeatured />
            </div>
          ))}
          {/* Pad with empty entries if catalog doesn't have 3 items */}
          {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
            <div
              key={`fallback-p-${i}`}
              className="p-stack-md bg-white flex items-center justify-center text-zinc-400 font-light min-h-[350px]"
            >
              Coming Soon
            </div>
          ))}

          {/* Product 4: Editorial Card */}
          <div className="p-stack-md bg-primary text-white flex flex-col justify-end min-h-[350px]">
            <p className="font-display-lg text-[32px] mb-stack-sm leading-tight text-white">
              The Essential Wardrobe
            </p>
            <p className="font-body-md text-on-primary-container mb-stack-md text-white/70">
              A collection of foundation pieces designed to endure.
            </p>
            <LocalizedClientLink
              href="/store"
              className="font-label-lg uppercase border-b border-white w-fit pb-1 hover:opacity-50 transition-opacity text-white"
            >
              SHOP ALL ESSENTIALS
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* Full Width Brand Narrative */}
      <BrandNarrative />
    </div>
  )
}

