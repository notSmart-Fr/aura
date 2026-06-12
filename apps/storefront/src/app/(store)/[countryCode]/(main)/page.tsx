import { Metadata } from "next"
import { getPayload } from "payload"
import config from "../../../../../payload.config"
import type { HeroBanner, Lookbook } from "../../../../../payload-types"
import { listProducts } from "@lib/data/products"
import HomeTemplate from "@modules/home/templates"

export const metadata: Metadata = {
  title: "Aura Minimalist Storefront",
  description:
    "Luxury apparel storefront built with Next.js, Medusa v2, and Payload CMS.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params

  const payloadInstance = await getPayload({ config })

  const [products, cmsContent, teaserContent] = await Promise.all([
    listProducts({ countryCode })
      .then((res) => res.response.products)
      .catch(() => []),
    payloadInstance
      .find({
        collection: "hero-banners",
        limit: 1,
        depth: 1,
      })
      .then((res) => (res.docs?.[0] as unknown as HeroBanner) || null)
      .catch(() => null),
    payloadInstance
      .find({
        collection: "lookbooks",
        limit: 1,
        depth: 1,
      })
      .then((res) => (res.docs?.[0] as unknown as Lookbook) || null)
      .catch(() => null),
  ])

  return (
    <HomeTemplate
      products={products}
      cmsContent={cmsContent}
      teaserContent={teaserContent}
    />
  )
}



