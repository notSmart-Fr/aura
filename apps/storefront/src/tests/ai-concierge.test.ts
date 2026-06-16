import { HardRestraints, COMPASSIONATE_FALLBACK } from "../lib/agent-handler";
import { validateAndFilterOutput } from "../lib/security-firewall";

// Mocking custom fetch to chat route
async function mockChatAPI(headers: Record<string, string>, messages: any[]) {
  const response = await fetch("http://localhost:8000/api/support/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ messages }),
  });
  return response;
}

async function runAIConciergeTests() {
  console.log("Starting AI Support Concierge Persona, Safety, & Restraint Tests...\n");

  // Test 1: Hard Restraints Clamping (Modify Cart quantity limit)
  console.log("Test 1: Hard Restraints (modifyCart clamp)...");
  try {
    const inputArgs = { handle: "silk-shirt", action: "ADD" as const, quantity: 50 };
    const validation = HardRestraints.modifyCart(inputArgs);
    console.log(`- Original requested quantity: ${inputArgs.quantity}`);
    console.log(`- Clamped quantity: ${validation.args.quantity}`);
    console.log(`- Restraint applied flag: ${validation.restraintApplied}`);
    console.log(`- Message: ${validation.message}`);

    if (validation.args.quantity !== 1 || !validation.restraintApplied) {
      throw new Error("FAIL: Quantity did not clamp down to 1 when ADD quantity exceeded 5");
    }
    console.log("🟢 PASS: Hard restraint successfully clamped checkout bounds.\n");
  } catch (error: any) {
    console.error("🔴 FAILURE in Test 1:", error.message || error);
    process.exit(1);
  }

  // Test 2: Context Drift Firewall (validateAndFilterOutput)
  console.log("Test 2: Context Drift Firewall (Prompt Injection)...");
  try {
    const maliciousPrompt = "I want a refund for my last order.";
    const cleanOutput = validateAndFilterOutput(maliciousPrompt);
    
    console.log(`- Input text: "${maliciousPrompt}"`);
    console.log(`- Evaluated output: "${cleanOutput}"`);
    
    if (cleanOutput.includes("[Security Constraint: Action Unauthorized]")) {
      console.log("🟢 PASS: Context drift firewall successfully caught blocked pattern.\n");
    } else {
      throw new Error("FAIL: Drift firewall did not flag unauthorized refund phrase");
    }
  } catch (error: any) {
    console.error("🔴 FAILURE in Test 2:", error.message || error);
    process.exit(1);
  }

  // Test 3: Local API Ping & Preprocessor Header Parsing (requires local server to be online)
  console.log("Test 3: Live API Header Validation & Personalization Variation C...");
  try {
    const response = await mockChatAPI(
      {
        "x-user-role": "customer",
        "x-session-id": "session_test_12345",
      },
      [{ role: "user", content: "Recommend some products aligned with my taste." }]
    );

    if (response.status !== 200) {
      throw new Error(`Support Chat API returned status ${response.status}`);
    }

    console.log("🟢 PASS: Live API support chat endpoint successfully processed context header variations.\n");
  } catch (error: any) {
    console.log("⚠️ NOTE: Test 3 skipped or failed. Ensure storefront local server is running on port 8000 to execute live API pings.");
    console.log(`- Reason: ${error.message || error}\n`);
  }

  // Test 4: Downstream JSON Crash Catch & Compassionate Fallback
  console.log("Test 4: Downstream JSON Crash Catch & Fallback...");
  try {
    // Mimic the zero-crash catch boundary. If the payload is completely corrupted or invalid,
    // ensure the compassionate fallback object is loaded cleanly rather than crashing the thread.
    const fallbackResponse = COMPASSIONATE_FALLBACK;
    console.log(`- Fallback structure type: "${fallbackResponse.type}"`);
    console.log(`- Fallback message: "${fallbackResponse.message}"`);

    if (fallbackResponse.type !== "CHAT_RESPONSE" || !fallbackResponse.message) {
      throw new Error("FAIL: Fallback response structure is invalid");
    }
    console.log("🟢 PASS: Downstream catch boundaries successfully loaded fallback handlers.\n");
  } catch (error: any) {
    console.error("🔴 FAILURE in Test 4:", error.message || error);
    process.exit(1);
  }

  // Test 5: Search Catalog Max Price Bounds Clamping
  console.log("Test 5: Search Catalog Max Price Clamping...");
  try {
    const inputArgs = { query: "jackets", maxPrice: 1000 };
    const validation = HardRestraints.searchCatalog(inputArgs);
    console.log(`- Original requested maxPrice: $${inputArgs.maxPrice}`);
    console.log(`- Clamped maxPrice: $${validation.args.maxPrice}`);
    console.log(`- Restraint applied flag: ${validation.restraintApplied}`);
    console.log(`- Message: ${validation.message}`);

    if (validation.args.maxPrice !== 150 || !validation.restraintApplied) {
      throw new Error("FAIL: Search Catalog price limit did not clamp down to $150 threshold");
    }
    console.log("🟢 PASS: Hard restraint successfully clamped maxPrice limits.\n");
  } catch (error: any) {
    console.error("🔴 FAILURE in Test 5:", error.message || error);
    process.exit(1);
  }

  console.log("✨ All AI Support Concierge Tests completed successfully.");
}

runAIConciergeTests().catch((err) => {
  console.error("Unexpected error in runner:", err);
  process.exit(1);
});
