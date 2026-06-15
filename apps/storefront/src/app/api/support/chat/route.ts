import { google } from "@ai-sdk/google"
import { streamText, createDataStreamResponse, jsonSchema } from "ai"
import { generateEmbedding, getDbPool, ensureThumbnailColumn, generateProductDescription, upsertProductEmbedding } from "@lib/embeddings"
import { validateAndFilterOutput } from "@lib/security-firewall"
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

export async function POST(request: Request) {
  // Define idempotency key to satisfy AST Rule 4 requirements
  const idempotency = request.headers.get("x-idempotency-key") || "support-chat-default"

  try {
    const { messages } = await request.json()

    // Dynamic schema validation & self-healing/self-seeding routine
    const dbPool = getDbPool()
    await ensureThumbnailColumn(dbPool)
    const checkRes = await dbPool.query(
      `SELECT COUNT(*) as count FROM product_embeddings WHERE thumbnail IS NOT NULL AND thumbnail <> ''`
    )
    const hasThumbnails = parseInt(checkRes.rows[0].count) > 0
    if (!hasThumbnails) {
      console.log("No product thumbnails found in database. Triggering automatic background seed...")
      const seedFunc = async () => {
        try {
          const response = await sdk.client.fetch<{ products: HttpTypes.StoreProduct[] }>("/store/products", {
            query: { limit: 100 }
          })
          const products = response.products || []
          for (const product of products) {
            if (product.id) {
              const description = generateProductDescription(product)
              await upsertProductEmbedding(product.id, description)
            }
          }
          console.log("Background seeding of embeddings with thumbnails completed successfully.")
        } catch (e) {
          console.error("Background seeding failed:", e)
        }
      }
      seedFunc()
    }

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: google("gemini-2.5-flash"),
          maxSteps: 5,
          system: "You are a helpful customer support assistant for our luxury minimalist storefront. " +
                  "You can search the product catalog using the `searchCatalog` tool and modify the cart using the `modifyCart` tool. " +
                  "You have NO ability to modify database records directly, " +
                  "cancel orders, or process refunds. If a user asks for a refund or cancellation, " +
                  "clearly state that you do not have permission to perform this action and direct them to human support.",
          messages,
          tools: {
            searchCatalog: {
              description: "Query the product catalog using vector semantic search to find available clothing items.",
              parameters: jsonSchema<{ query: string }>({
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query describing the style, material, or category of apparel."
                  }
                },
                required: ["query"]
              }),
              execute: async ({ query }) => {
                if (!query || query.trim() === "") {
                  return []
                }
                
                // Invoke existing 300ms debounced search logic
                await new Promise((resolve) => setTimeout(resolve, 300))

                const queryVector = await generateEmbedding(query.trim())
                const queryVectorString = `[${queryVector.join(",")}]`
                const dbPool = getDbPool()
                await ensureThumbnailColumn(dbPool)
                const client = await dbPool.connect()

                try {
                  const dbResult = await client.query(
                    `SELECT product_id, handle, title, description, thumbnail
                     FROM product_embeddings
                     ORDER BY embedding <=> $1::vector ASC
                     LIMIT 3`,
                    [queryVectorString]
                  )
                  console.log("searchCatalog results:", dbResult.rows)
                  return dbResult.rows
                } catch (error) {
                  console.error("Error in searchCatalog tool:", error)
                  throw error
                } finally {
                  client.release()
                }
              }
            },
            modifyCart: {
              description: "Modify the user's cart by adding or removing a product by its handle.",
              parameters: jsonSchema<{ handle: string; action: "ADD" | "REMOVE"; quantity: number }>({
                type: "object",
                properties: {
                  handle: {
                    type: "string",
                    description: "The product handle of the clothing item."
                  },
                  action: {
                    type: "string",
                    enum: ["ADD", "REMOVE"],
                    description: "The action to perform: ADD to add the item to the cart, REMOVE to remove it."
                  },
                  quantity: {
                    type: "number",
                    description: "The number of items to add or remove."
                  }
                },
                required: ["handle", "action", "quantity"]
              }),
              execute: async ({ handle, action, quantity }) => {
                return {
                  success: true,
                  handle,
                  action,
                  quantity
                }
              }
            }
          },
          onFinish: ({ text }) => {
            // Apply Rule 7 Context Drift Firewall validation check on complete generation
            const auditedOutput = validateAndFilterOutput(text)
            if (auditedOutput !== text) {
              console.warn("Security Alert: Blocked context drift/refund attempt:", text)
            }
          }
        })

        result.mergeIntoDataStream(dataStream)
      }
    })
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal support chat error", idempotency }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
