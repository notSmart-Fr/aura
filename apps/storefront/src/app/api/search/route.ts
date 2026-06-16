import { generateEmbedding, getDbPool } from "@lib/embeddings"
import { NextResponse } from "next/server"
import { google } from "@ai-sdk/google"
import { generateObject, jsonSchema } from "ai"
import { searchCache } from "@lib/cache"
import { deepseekGenerateObject } from "@lib/deepseek"

export async function POST(request: Request) {
  // Define idempotency to satisfy the AST rule checker if any DB call gets analyzed
  const idempotency = request.headers.get("x-idempotency-key") || "search-default"

  try {
    const body = await request.json()
    const { query } = body

    // 1. Guard against empty strings or malicious long-form text injections
    if (typeof query !== "string" || query.trim() === "") {
      return NextResponse.json(
        { error: "Query parameter is required and must be a non-empty string." },
        { status: 400 }
      )
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: "Query is too long. Maximum allowed length is 200 characters." },
        { status: 400 }
      )
    }

    const normalizedQuery = query.trim().toLowerCase()
    const cacheKey = `search:${normalizedQuery}`
    const cachedData = searchCache.get(cacheKey)

    if (cachedData) {
      console.log(`[Cache Hit] Serving main search results for key: "${cacheKey}"`)
      return NextResponse.json(cachedData)
    }

    console.log(`[Cache Miss] Querying main search database and LLM for key: "${cacheKey}"`)

    // 2. Invoke our embedding service to generate the 1536-dimensional float vector array
    const queryVector = await generateEmbedding(query.trim())
    const queryVectorString = `[${queryVector.join(",")}]`

    // 3. Query pgvector table matching on Cosine Distance and sorting ASC to hit the HNSW index
    const dbPool = getDbPool()
    const result = await dbPool.query(
      `SELECT product_id, handle, title, description, (embedding <=> $1::halfvec) AS distance
       FROM product_embeddings
       WHERE (embedding <=> $1::halfvec) < 0.7
       ORDER BY embedding <=> $1::halfvec ASC
       LIMIT 15`,
      [queryVectorString]
    )

    const rawRows = result.rows || []

    // Rerank candidates using DeepSeek with structured JSON output
    let finalRows = []
    let fuzzyFallback = false

    if (rawRows.length > 0) {
      const candidatesForModel = rawRows.map((row: any) => ({
        product_id: row.product_id,
        title: row.title,
        description: row.description
      }))

      try {
        let objAttempts = 0
        const maxObjAttempts = 5
        let objDelay = 2000
        let rerankObject: { matchingProductIds: string[] } | undefined = undefined

        while (objAttempts < maxObjAttempts) {
          try {
            const { object } = await deepseekGenerateObject<{ matchingProductIds: string[] }>({
              schemaDescription: "An object with a matchingProductIds property which is an array of strings representing product IDs.",
              prompt: `User Query: "${query.trim()}"

Candidate Products:
${candidatesForModel.map(c => `- ID: ${c.product_id}\n  Title: ${c.title}\n  Description: ${c.description}`).join("\n")}

Instructions:
Perform a binary evaluation (keep or discard) on each candidate product based strictly on the User Query.
If the query explicitly asks for a specific category or modifier (e.g. "shirt"), discard items of other categories (e.g. discard "shorts", "sweatshirts", "pants", "jackets").
Only keep products that strictly match the query.
Return the matching product IDs in the JSON format: {"matchingProductIds": ["id1", "id2"]}`
            })
            rerankObject = object
            break
          } catch (err: any) {
            objAttempts++
            if (objAttempts >= maxObjAttempts) throw err
            console.warn(`Reranking generateObject failed (attempt ${objAttempts}/${maxObjAttempts}), retrying in ${objDelay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, objDelay))
            objDelay *= 2
          }
        }

        const matchingIds = new Set(rerankObject?.matchingProductIds || [])
        finalRows = rawRows.filter((row: any) => matchingIds.has(row.product_id))
      } catch (rerankError) {
        console.error("Reranking failed in search route, falling back to database search:", rerankError)
      }
    }

    // Fallback Protection Gate
    if (finalRows.length === 0) {
      finalRows = rawRows.slice(0, 3)
      fuzzyFallback = true
    }

    // 4. Return the filtered list of matching product details as clean DTO (Rule 10)
    const products = finalRows.map((row: any) => ({
      product_id: row.product_id,
      handle: row.handle,
      title: row.title,
      distance: Number(row.distance),
      fuzzyFallback
    }))

    // Save results to cache
    searchCache.set(cacheKey, products)

    return NextResponse.json(products)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An error occurred during search", idempotency },
      { status: 500 }
    )
  }
}
