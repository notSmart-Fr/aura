import { NextResponse } from "next/server"
import { listProducts } from "@lib/data/products"
import { retrieveCart, addToCart, deleteLineItem } from "@lib/data/cart"

export async function POST(request: Request) {
  try {
    const { handle, action, quantity, countryCode, size, color } = await request.json()

    if (!handle || !action || !countryCode) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // Resolve the product by handle
    const { response } = await listProducts({
      countryCode,
      queryParams: { handle, limit: 1 },
    })

    const product = response?.products?.[0]
    if (!product) {
      return NextResponse.json({ error: `Product with handle "${handle}" not found` }, { status: 404 })
    }

    if (action === "ADD") {
      let variant = product.variants?.[0]
      if (size || color) {
        const sizeOption = product.options?.find(o => o.title?.toLowerCase() === "size")
        const colorOption = product.options?.find(o => o.title?.toLowerCase() === "color")

        const foundVariant = product.variants?.find((v) => {
          // Attempt direct title match first
          const vTitle = (v.title || "").toLowerCase()
          const sizeInTitle = !size || vTitle.includes(size.toLowerCase())
          const colorInTitle = !color || vTitle.includes(color.toLowerCase())
          if (sizeInTitle && colorInTitle) {
            return true
          }

          // Fall back to exact option value verification
          let sizeMatch = !size
          let colorMatch = !color

          if (size && sizeOption) {
            const optVal = v.options?.find(o => o.option_id === sizeOption.id)
            if (optVal?.value?.toLowerCase() === size.toLowerCase()) {
              sizeMatch = true
            }
          }
          if (color && colorOption) {
            const optVal = v.options?.find(o => o.option_id === colorOption.id)
            if (optVal?.value?.toLowerCase() === color.toLowerCase()) {
              colorMatch = true
            }
          }

          return sizeMatch && colorMatch
        })
        if (foundVariant) {
          variant = foundVariant
        }
      }
      const variantId = variant?.id
      if (!variantId) {
        return NextResponse.json({ error: "Product variant not found" }, { status: 404 })
      }
      await addToCart({
        variantId,
        quantity: quantity || 1,
        countryCode,
      })
      const sizeText = size ? ` (Size ${size})` : ""
      const colorText = color ? ` in ${color}` : ""
      return NextResponse.json({ success: true, message: `Added ${product.title}${colorText}${sizeText} to cart.` })
    } else if (action === "REMOVE") {
      const cart = await retrieveCart()
      if (!cart || !cart.items) {
        return NextResponse.json({ error: "Cart not found or empty" }, { status: 404 })
      }

      // Find the line item corresponding to any of the product's variants
      const productVariantIds = new Set(product.variants?.map((v) => v.id) || [])
      const lineItem = cart.items.find((item) => productVariantIds.has(item.variant_id || ""))

      if (!lineItem) {
        return NextResponse.json({ error: "Item not found in cart" }, { status: 404 })
      }

      await deleteLineItem(lineItem.id)
      return NextResponse.json({ success: true, message: `Removed ${product.title} from cart.` })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
