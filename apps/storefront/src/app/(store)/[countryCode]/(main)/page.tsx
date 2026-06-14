import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPayload } from "payload"
import config from "../../../../../payload.config"
import { HeroBlock } from "@/components/blocks/HeroBlock"
import { ProductGridBlock } from "@/components/blocks/ProductGridBlock"
import { ManifestoBlock } from "@/components/blocks/ManifestoBlock"
import { AsymmetricalGridBlock } from "@/components/blocks/AsymmetricalGridBlock"

// Force dynamic execution to resolve cache invalidation
// Force page reload on config update
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Aura Minimalist Storefront",
  description:
    "Luxury apparel storefront built with Next.js, Medusa v2, and Payload CMS.",
}

const blockRegistry: Record<string, React.ComponentType<any>> = {
  hero: HeroBlock,
  productGrid: ProductGridBlock,
  manifesto: ManifestoBlock,
  "asymmetrical-grid": AsymmetricalGridBlock,
}

interface PageProps {
  params: Promise<{ countryCode: string }>
}

export default async function HomePage({ params }: PageProps) {
  const { countryCode } = await params

  // Fetch page composition dynamically from Payload Pages collection
  const payloadInstance = await getPayload({ config })
  const pageData = await payloadInstance
    .find({
      collection: "pages",
      where: {
        slug: {
          equals: "home",
        },
      },
      limit: 1,
      depth: 2,
    })
    .then((res) => (res.docs?.[0] as any) || null)
    .catch(() => null)

  // Fallback default layout structure if the home page document hasn't been created in Payload yet
  const layout = pageData?.layout || [
    {
      id: "default-hero",
      blockType: "hero",
      title: "The Curated Line",
      description: "A study in architectural silhouettes and the luxury of restraint. Explore the Spring/Summer Editorial.",
      buttonText: "VIEW COLLECTION",
      buttonLink: "/store",
    },
    {
      id: "default-grid",
      blockType: "productGrid",
      editorialTitle: "The Essential Wardrobe",
      editorialText: "A collection of foundation pieces designed to endure.",
      editorialLink: "/store",
      editorialLinkText: "SHOP ALL ESSENTIALS",
    },
    {
      id: "default-manifesto",
      blockType: "manifesto",
    },
  ]

  return (
    <div className="bg-white min-h-screen pt-[100px] flex flex-col">
      {layout.map((block: any, index: number) => {
        const BlockComponent = blockRegistry[block.blockType]

        if (!BlockComponent) {
          console.warn(`No slot component registered for block type: ${block.blockType}`)
          return null
        }

        return (
          <BlockComponent
            key={block.id || `block-${index}`}
            data={block}
            locale={countryCode}
          />
        )
      })}
    </div>
  )
}




