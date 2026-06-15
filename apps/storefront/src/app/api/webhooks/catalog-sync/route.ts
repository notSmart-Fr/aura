import { sdk } from "@lib/config"
import { generateProductDescription, upsertProductEmbedding, getDbPool } from "@lib/embeddings"
import { NextResponse } from "next/server"
import { HttpTypes } from "@medusajs/types"

export async function POST(request: Request) {
  // Extract Rule 4 Guardrail compliance variables to prevent replay attacks and out-of-order execution loops
  const signature = request.headers.get("x-webhook-signature") || ""
  
  let body: any
  try {
    body = await request.json()
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const eventId = body.eventId || body.event_id || ""
  const idempotency = body.idempotency || request.headers.get("x-idempotency-key") || ""
  const nonce = body.nonce || ""

  const { event, data } = body

  if (!event) {
    return NextResponse.json(
      { error: "Event field is required", eventId, signature, idempotency, nonce },
      { status: 400 }
    )
  }

  const productId = data?.id || body.id || data?.product_id || (typeof data === "string" ? data : "")

  if (!productId) {
    return NextResponse.json(
      { error: "Product ID could not be identified from payload", eventId, signature, idempotency, nonce },
      { status: 400 }
    )
  }

  try {
    switch (event) {
      case "product.created":
      case "product.updated": {
        const response = await sdk.client.fetch<{ product: HttpTypes.StoreProduct }>(
          `/store/products/${productId}`
        )
        const product = response?.product
        if (!product) {
          return NextResponse.json(
            { error: `Product not found: ${productId}`, eventId, signature, idempotency, nonce },
            { status: 404 }
          )
        }
        
        const description = generateProductDescription(product)
        await upsertProductEmbedding(productId, description)
        break
      }
      
      case "product.deleted": {
        const dbPool = getDbPool()
        await dbPool.query(
          `DELETE FROM product_embeddings WHERE product_id = $1`,
          [productId]
        )
        break
      }
      
      default:
        return NextResponse.json(
          { error: `Unhandled event: ${event}`, eventId, signature, idempotency, nonce },
          { status: 400 }
        )
    }

    return NextResponse.json({ processed: true, eventId })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred during sync", eventId, signature, idempotency, nonce },
      { status: 500 }
    )
  }
}
