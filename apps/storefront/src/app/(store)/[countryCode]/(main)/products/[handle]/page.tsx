import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string; color?: string; [key: string]: string | undefined }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string,
  selectedColor?: string
) {
  if (selectedColor) {
    const lowerColor = selectedColor.toLowerCase()
    const filtered = product.images?.filter((image) => {
      if (!image.url) return false
      return image.url.toLowerCase().includes(lowerColor)
    })
    if (filtered && filtered.length > 0) {
      return filtered
    }
  }

  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant) {
    return product.images
  }

  if (variant.images?.length) {
    const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
    return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
  }

  // Fallback color-based matching
  const optionValues: string[] = []
  if (Array.isArray(variant.options)) {
    variant.options.forEach((vo: any) => {
      if (vo && typeof vo.value === "string") {
        optionValues.push(vo.value.toLowerCase())
      }
    })
  } else if (variant.options && typeof variant.options === "object") {
    Object.values(variant.options).forEach((val) => {
      if (typeof val === "string") {
        optionValues.push(val.toLowerCase())
      }
    })
  }

  const colorOption = product.options?.find(
    (o) => o.title?.toLowerCase() === "color"
  )

  if (colorOption) {
    const selectedColor = optionValues.find((val) => {
      return colorOption.values?.some((cov: any) => {
        const covVal = (typeof cov === "string" ? cov : cov.value)?.toLowerCase()
        return covVal === val
      })
    })

    if (selectedColor) {
      const filtered = product.images?.filter((image) => {
        if (!image.url) return false
        const urlLower = image.url.toLowerCase()
        return urlLower.includes(selectedColor)
      })
      if (filtered && filtered.length > 0) {
        return filtered
      }
    }
  }

  return product.images
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id
  const selectedColor = searchParams.color

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  const images = getImagesForVariant(pricedProduct, selectedVariantId, selectedColor)

  if (!pricedProduct) {
    notFound()
  }

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
    />
  )
}
