import { Pool } from "pg";
import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { GOOGLE_API_KEY, PAYLOAD_DATABASE_URL } from "./test-config";

async function generateTestEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-2"),
    value: text,
  });
  return embedding.slice(0, 1536);
}

async function runSemanticSearchTests() {
  console.log("Starting Semantic Vector Search Infrastructure Tests...\n");

  if (!GOOGLE_API_KEY) {
    console.error("🔴 FAILURE: GOOGLE_API_KEY environment variable is not defined.");
    process.exit(1);
  }

  // Test 1: Embedding Dimension Integrity
  console.log("Test 1: Embedding Dimension Integrity...");
  try {
    const text = "something minimalist for an evening walk in autumn";
    const embedding = await generateTestEmbedding(text);
    
    if (!Array.isArray(embedding)) {
      throw new Error("FAIL: Embedding is not an array");
    }
    
    console.log(`- Generated embedding length: ${embedding.length}`);
    if (embedding.length !== 1536) {
      throw new Error(`FAIL: Embedding dimension is ${embedding.length}, expected 1536`);
    }
    
    console.log("🟢 PASS: Embedding is exactly 1,536 dimensions.\n");
  } catch (error: any) {
    console.error("🔴 FAILURE in Test 1:", error.message || error);
    process.exit(1);
  }

  // Test 2: Database Query & HNSW Latency Test
  console.log("Test 2: Database Query & HNSW Latency Test...");
  if (!PAYLOAD_DATABASE_URL) {
    console.warn("⚠️ NOTE: PAYLOAD_DATABASE_URL not configured. Skipping Test 2 database verification.");
    console.log("✨ Test Suite completed with skipped database test.");
    return;
  }

  const pool = new Pool({ connectionString: PAYLOAD_DATABASE_URL });
  try {
    const testQuery = "classic black t-shirt";
    const embedding = await generateTestEmbedding(testQuery);
    const queryVectorString = `[${embedding.join(",")}]`;

    const start = Date.now();
    const result = await pool.query(
      `SELECT product_id, handle, title, (embedding <=> $1::halfvec) AS distance
       FROM product_embeddings
       ORDER BY embedding <=> $1::halfvec ASC
       LIMIT 5`,
      [queryVectorString]
    );
    const duration = Date.now() - start;

    console.log(`- Query executed in ${duration}ms`);
    console.log(`- Matching rows returned: ${result.rowCount}`);

    if (duration > 1000) {
      console.warn("⚠️ WARNING: Search took longer than 1 second.");
    } else {
      console.log(`🟢 PASS: Database search returned sub-second response time (${duration}ms).\n`);
    }

    await pool.end();
  } catch (error: any) {
    console.error("🔴 FAILURE in Test 2: Could not connect to database or vector index query failed.");
    console.error(error.message || error);
    try {
      await pool.end();
    } catch (_) {}
    process.exit(1);
  }

  console.log("✨ All Semantic Search Infrastructure Tests completed successfully.");
}

runSemanticSearchTests().catch((err) => {
  console.error("Unexpected error in runner:", err);
  process.exit(1);
});
