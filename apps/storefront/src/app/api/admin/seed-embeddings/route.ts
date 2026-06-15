import { sdk } from "@lib/config"
import { processInBatches } from "@lib/batch-processor"
import { generateProductDescription, upsertProductEmbedding } from "@lib/embeddings"
import { NextResponse } from "next/server"
import { HttpTypes } from "@medusajs/types"

export async function POST(request: Request) {
  // Enforce AST Rule 4 compliance
  const idempotency = request.headers.get("x-idempotency-key") || "seed-default"

  // 1. Perimeter Auth Guard
  const authHeader = request.headers.get("authorization")
  const secret = process.env.ADMIN_AI_SEED_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 2. Fetch the complete list of products currently inside default boilerplate catalog
    const response = await sdk.client.fetch<{ products: HttpTypes.StoreProduct[] }>("/store/products", {
      query: { limit: 100 }
    })
    const products: HttpTypes.StoreProduct[] = response.products || []

    let indexedCount = 0

    // 3. Process products in batches of 5
    await processInBatches(products, 5, async (batch) => {
      for (const product of batch) {
        if (product.id) {
          const description = generateProductDescription(product)
          await upsertProductEmbedding(product.id, description)
          indexedCount++
        }
      }
    })

    return NextResponse.json({ indexed: true, count: indexedCount })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred during seeding", idempotency },
      { status: 500 }
    )
  }
}
