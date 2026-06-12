import type { Lookbook } from "../../../../../payload-types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function TeaserSection({ data: lookbookData }: { data?: Lookbook | null }) {
  const items = lookbookData?.items || []

  if (items.length === 0) {
    return null
  }

  const firstItem = items[0]
  const secondItem = items[1] || items[0]

  const getHref = (item: typeof firstItem) => {
    if (!item.targetHandle) return "/store"
    return item.linkType === "collection"
      ? `/collections/${item.targetHandle}`
      : `/products/${item.targetHandle}`
  }

  const getDisplayTitle = (item: typeof firstItem) => {
    if (item.caption) return item.caption
    if (!item.targetHandle) return "Architectural Design"
    return item.targetHandle
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  return (
    <section className="px-margin-desktop mb-stack-xl border-t border-primary pt-stack-xl bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter bg-primary">
        {/* Grid Item 1: Large Image */}
        <div className="bg-white p-stack-lg flex flex-col justify-between aspect-[3/4]">
          <div className="w-full h-4/5 overflow-hidden group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={getDisplayTitle(firstItem)}
              className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
              src={firstItem.imageUrl}
            />
          </div>
          <div className="pt-stack-md flex flex-col items-start">
            <span className="font-label-md text-label-md tracking-widest uppercase text-secondary">
              TEXTURE & FORM
            </span>
            <h2 className="font-headline-md text-headline-md mt-2 text-primary">
              {getDisplayTitle(firstItem)}
            </h2>
            <LocalizedClientLink
              href={getHref(firstItem)}
              className="inline-block mt-4 font-label-lg border-b border-primary pb-1 hover:opacity-50 transition-opacity"
            >
              {firstItem.linkType === "collection" ? "SHOP COLLECTION" : "SHOP ACCESSORIES"}
            </LocalizedClientLink>
          </div>
        </div>

        {/* Grid Item 2: Split Content */}
        <div className="flex flex-col gap-gutter bg-primary">
          <div className="bg-white p-stack-lg flex-1 flex flex-col justify-center">
            <div className="max-w-sm">
              <h3 className="font-display-lg text-[48px] leading-tight mb-stack-sm text-primary">
                {lookbookData?.title || "Quiet Luxury Defined"}
              </h3>
              {lookbookData?.description && (
                <p className="font-body-md text-secondary leading-relaxed mb-stack-md">
                  {lookbookData.description}
                </p>
              )}
              <LocalizedClientLink href={getHref(secondItem)}>
                <button className="border border-primary px-stack-md py-stack-sm font-label-lg uppercase tracking-widest hover:bg-primary hover:text-white transition-colors duration-300 sharp-edge bg-white text-primary">
                  DISCOVER MORE
                </button>
              </LocalizedClientLink>
            </div>
          </div>
          <div className="bg-white overflow-hidden aspect-video relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Structural garment detail"
              className="w-full h-full object-cover"
              src={secondItem.imageUrl}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
