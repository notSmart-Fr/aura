import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  // Parse variant's active color option
  const colorOption = product.options?.find((o) => o.title?.toLowerCase() === "color")
  const activeColor = product.variants?.[0]?.options?.find(
    (vOpt) => vOpt.option_id === colorOption?.id
  )?.value || colorOption?.values?.[0]?.value || ""

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
          isFeatured={isFeatured}
        />
        <div className="flex justify-between items-baseline mt-4">
          <div className="flex flex-col">
            <span className="font-label-lg text-primary uppercase" data-testid="product-title">
              {product.title}
            </span>
            {activeColor && (
              <span className="font-label-md text-secondary uppercase mt-1">
                {activeColor}
              </span>
            )}
          </div>
          <div className="flex items-center font-body-md text-primary">
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
