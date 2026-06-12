import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import crypto from "crypto";

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
  const { email, signature } = req.body as { email: string; signature: string };

  if (!email || !signature) {
    return res.status(400).json({ error: "Email and signature are required" });
  }

  // Validate the signature using the shared Payload secret (HMAC check)
  const payloadSecret = process.env.PAYLOAD_SECRET || "supersecretpayloadkey123";
  const expectedSignature = crypto.createHmac("sha256", payloadSecret).update(email).digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Unauthorized request signature" });
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any;
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any;
  const authModuleService = req.scope.resolve("authModuleService") as any;
  const customerModuleService = req.scope.resolve("customerModuleService") as any;

  try {
    // 1. Query the customer
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: {
        email,
      },
    });

    let customer = customers?.[0];

    // 2. Query the auth_user separately to avoid property typing issues on Customer
    const [existingAuthUser] = await authModuleService.listAuthUsers({
      provider: "emailpass",
      entity_id: email,
    });

    let authUser = existingAuthUser;

    // 3. If customer doesn't exist, create one
    if (!customer) {
      customer = await customerModuleService.createCustomers({
        email,
      });
    }

    // 4. If auth_user doesn't exist, create it and link it to the customer
    if (!authUser) {
      authUser = await authModuleService.createAuthUsers({
        provider: "emailpass",
        entity_id: email,
      });

      // Link the AuthUser and Customer models
      await link.create({
        [Modules.AUTH]: {
          auth_user_id: authUser.id,
        },
        [Modules.CUSTOMER]: {
          customer_id: customer.id,
        },
      });
    }

    // 5. Generate a native Medusa JWT token signed with Medusa's JWT secret
    const jwtSecret = process.env.JWT_SECRET || "supersecret";
    const token = signMedusaJwt(
      {
        actor_id: customer.id,
        auth_user_id: authUser.id,
        domain: "store",
      },
      jwtSecret
    );

    return res.status(200).json({ token });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate session" });
  }
}
