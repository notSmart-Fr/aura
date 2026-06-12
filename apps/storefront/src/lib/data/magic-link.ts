"use server"

import crypto from "crypto"
import { setAuthToken } from "./cookies"
import { revalidateTag } from "next/cache"
import { transferCart } from "./customer"

const MAGIC_LINK_JWT_SECRET = process.env.MAGIC_LINK_JWT_SECRET || process.env.PAYLOAD_SECRET || "supersecretpayloadkey123"
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || "supersecretpayloadkey123"
const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"

// Helper to generate a secure signed token natively using crypto
function generateStorefrontToken(email: string, secret: string): string {
  const expiresAt = Date.now() + 15 * 60 * 1000 // 15 mins expiry
  const payload = JSON.stringify({ email, expiresAt })
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  return Buffer.from(JSON.stringify({ payload, hmac })).toString("base64url")
}

// Helper to verify storefront token
function verifyStorefrontToken(token: string, secret: string): string {
  const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"))
  const { payload, hmac } = decoded
  const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  
  if (hmac !== expectedHmac) {
    throw new Error("Invalid token signature")
  }
  
  const { email, expiresAt } = JSON.parse(payload)
  if (Date.now() > expiresAt) {
    throw new Error("Token has expired")
  }
  
  return email
}

export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email) {
    return { success: false, error: "Email is required" }
  }

  try {
    // Generate secure storefront-signed token
    const token = generateStorefrontToken(email, MAGIC_LINK_JWT_SECRET)

    // Create the magic link
    const magicLink = `${BASE_URL}/api/auth/magic-link?token=${token}`

    // Send the email using Resend API directly via HTTP fetch
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not defined. Logging magic link to console:", magicLink)
      return { 
        success: true 
      }
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Your Aura Storefront Sign-In Link",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 0px;">
            <h2 style="font-weight: 300; text-transform: uppercase; letter-spacing: 0.1em; color: #111111;">Aura Minimalist Storefront</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5;">You requested a secure magic link to sign in to your account. This link will expire in 15 minutes.</p>
            <div style="margin: 30px 0;">
              <a href="${magicLink}" style="background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.2em; display: inline-block;">Sign In to Aura</a>
            </div>
            <p style="color: #999999; font-size: 12px;">If you did not request this email, you can safely ignore it.</p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.message || "Failed to send email via Resend" }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "An error occurred while sending the magic link" }
  }
}

export async function verifyMagicLinkToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Verify the storefront token
    const email = verifyStorefrontToken(token, MAGIC_LINK_JWT_SECRET)

    if (!email) {
      return { success: false, error: "Invalid token payload" }
    }

    // 2. Generate signature using built-in crypto HMAC to authenticate the storefront request
    const signature = crypto.createHmac("sha256", PAYLOAD_SECRET).update(email).digest("hex")

    // 3. Coordinate with Medusa v2 native session/auth module
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/custom/magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, signature }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.error || "Failed to authenticate session with Medusa" }
    }

    const { token: medusaToken } = await response.json()

    // 4. Set the authentication token cookie
    await setAuthToken(medusaToken)

    // Revalidate caches and transfer the cart
    const revalidate = revalidateTag as any
    revalidate("customers")
    try {
      await transferCart()
    } catch (e) {
      console.error("Cart transfer error:", e)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Invalid or expired magic link token" }
  }
}
