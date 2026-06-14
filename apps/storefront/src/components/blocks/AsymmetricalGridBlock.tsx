import React from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface GridItem {
  caption?: string
  imageUrl: string
  linkType: "product" | "collection"
  targetHandle: string
}

interface AsymmetricalGridBlockProps {
  data: {
    title: string
    description?: string
    items?: GridItem[]
  }
  locale: string
}

export function AsymmetricalGridBlock({ data, locale }: AsymmetricalGridBlockProps) {
  const items = data.items || []
  const item1 = items[0]
  const item2 = items[1]

  const getLinkHref = (item?: GridItem) => {
    if (!item) return "/store"
    return item.linkType === "collection"
      ? `/collections/${item.targetHandle}`
      : `/products/${item.targetHandle}`
  }

  const fallbackImage1 = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
  const fallbackImage2 = "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80"

  const img1Src = item1?.imageUrl || fallbackImage1
  const img2Src = item2?.imageUrl || fallbackImage2

  return (
    <section className="w-full px-margin-desktop mb-stack-xl bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 bg-primary gap-gutter">
        {/* Column 1: Large Image */}
        <div className="relative flex flex-col bg-white p-stack-md group justify-between aspect-[3/4]">
          <div className="relative w-full h-[70%] overflow-hidden bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img1Src}
              alt={item1?.caption || data.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="mt-stack-sm flex flex-col justify-end flex-grow">
            <span className="font-label-md text-label-md text-secondary uppercase tracking-[0.2em] mb-2">
              {item1?.caption || "EDITORIAL"}
            </span>
            <h2 className="font-display-lg text-headline-lg text-primary mb-4 leading-tight">
              {data.title}
            </h2>
            <LocalizedClientLink
              href={getLinkHref(item1)}
              className="font-label-lg uppercase border-b border-primary w-fit pb-1 hover:opacity-50 transition-opacity text-primary"
            >
              Explore Item
            </LocalizedClientLink>
          </div>
        </div>

        {/* Column 2: Split Content */}
        <div className="grid grid-rows-2 bg-primary gap-gutter">
          {/* Top Row: Layout Description / Editorial text block */}
          <div className="bg-white p-stack-md flex flex-col justify-center">
            <p className="font-body-lg text-body-lg text-graphite leading-relaxed max-w-md">
              {data.description || "A study in architectural silhouettes and the luxury of restraint."}
            </p>
          </div>
          {/* Bottom Row: Detail image */}
          <div className="relative bg-white p-stack-md group flex flex-col justify-between aspect-video">
            <div className="relative w-full h-full overflow-hidden bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img2Src}
                alt={item2?.caption || "Detail"}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            {item2 && (
              <div className="absolute bottom-stack-md left-stack-md bg-white/95 px-4 py-2 border border-primary">
                <LocalizedClientLink
                  href={getLinkHref(item2)}
                  className="font-label-lg uppercase hover:opacity-50 transition-opacity text-primary"
                >
                  {item2.caption || "View Detail"}
                </LocalizedClientLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
