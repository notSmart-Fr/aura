import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Helper function to sign HS256 JWTs natively using Node.js crypto module to avoid dependency errors
function signMedusaJwt(payload: any, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("[DEBUG] Backend magic-link token request body:", req.body);
  
  const { email, signature } = req.body as { email: string; signature: string };

  if (!email || !signature) {
    console.error("[DEBUG] Missing parameters. email:", email, "signature:", signature);
    return res.status(400).json({ error: "Email and signature are required" });
  }

  // Validate the signature using the shared Payload secret (HMAC check)
  const payloadSecret = process.env.PAYLOAD_SECRET || "supersecretpayloadkey123";
  const expectedSignature = crypto.createHmac("sha256", payloadSecret).update(email).digest("hex");

  console.log("[DEBUG] Verifying signatures. Received:", signature, "Expected:", expectedSignature);

  if (signature !== expectedSignature) {
    console.error("[DEBUG] Signature verification failed.");
    return res.status(401).json({ error: "Unauthorized request signature" });
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any;
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any;
    const authServiceLocal = req.scope.resolve("auth") as any;
    const customerModuleService = req.scope.resolve("customer") as any;
    console.log("[DEBUG] Finding customer for email:", email);
    // 1. Query the customer
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: {
        email,
      },
    });

    let customer = customers?.[0];
    console.log("[DEBUG] Found customer:", customer);

    // 2. Query the auth_identity separately
    console.log("[DEBUG] Finding existing auth_identity...");
    const { data: authIdentities } = await query.graph({
      entity: "auth_identity",
      fields: [
        "id",
        "provider_identities.id",
        "provider_identities.provider",
        "provider_identities.entity_id"
      ],
      filters: {
        provider_identities: {
          provider: "emailpass",
          entity_id: email,
        }
      },
    });
    
    let authUser = authIdentities?.[0];
    console.log("[DEBUG] Found existing auth_identity:", authUser);

    // 3. If customer doesn't exist, create one
    if (!customer) {
      console.log("[DEBUG] Customer not found. Creating a new customer record...");
      const createdCustomers = await customerModuleService.createCustomers([
        { email }
      ]);
      customer = createdCustomers[0];
      console.log("[DEBUG] Created customer:", customer);
    }

    // 4. If auth_identity doesn't exist, create it and link it to the customer
    if (!authUser) {
      console.log("[DEBUG] Auth identity not found. Creating a new auth identity...");
      const createdAuthIdentities = await authServiceLocal.createAuthIdentities([
        {
          provider_identities: [
            {
              provider: "emailpass",
              entity_id: email,
            }
          ]
        }
      ]);
      authUser = createdAuthIdentities[0];
      console.log("[DEBUG] Created auth identity:", authUser);

      console.log("[DEBUG] Linking auth identity and customer...");
      // Link the AuthIdentity and Customer models using Medusa v2 remote link
      await link.create({
        [Modules.AUTH]: {
          auth_identity_id: authUser.id,
        },
        [Modules.CUSTOMER]: {
          customer_id: customer.id,
        },
      });
      console.log("[DEBUG] Linked successfully.");
    }

    // 5. Generate a native Medusa JWT token signed with Medusa's JWT secret
    const jwtSecret = process.env.JWT_SECRET || "supersecret";
    const token = signMedusaJwt(
      {
        actor_id: customer.id,
        actor_type: "customer",
        auth_identity_id: authUser.id,
        domain: "store",
      },
      jwtSecret
    );

    console.log("[DEBUG] Generated token successfully.");
    return res.status(200).json({ token });
  } catch (error: any) {
    console.error("[DEBUG] Error inside custom magic-link endpoint:", error);
    try {
      fs.writeFileSync(
        path.join(process.cwd(), "backend-error.log"),
        JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
    } catch (fsErr) {
      console.error("Failed to write backend error log:", fsErr);
    }
    return res.status(500).json({ error: error.message || "Failed to generate session" });
  }
}
