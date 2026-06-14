"use server"

import crypto from "crypto"
import { setAuthToken } from "./cookies"
import { revalidateTag } from "next/cache"
import { transferCart } from "./customer"

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

export async function sendOTP(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email) {
    return { success: false, error: "Email is required" }
  }

  try {
    // Dynamically import Payload to prevent Webpack client-bundling leaks
    const { getPayload } = await import("payload")
    const config = (await import("../../../payload.config")).default
    const payloadInstance = await getPayload({ config })

    // 1. Automatic Database Cleanup: Purge any existing, expired OTP entries for this email address
    try {
      await payloadInstance.delete({
        collection: "otps",
        where: {
          and: [
            { email: { equals: email } },
            { expiresAt: { less_than: Date.now() } }
          ]
        }
      })
    } catch (cleanupError) {
      console.error("Expired OTP purge error:", cleanupError)
    }

    // 2. Generate a secure random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 3. Save OTP code to the Payload CMS database
    const newOtp = await payloadInstance.create({
      collection: "otps",
      data: {
        email,
        code,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins expiry
      }
    })

    // DEBUG: Log the created OTP to a file immediately
    try {
      const fs = await import("fs")
      const path = await import("path")
      fs.writeFileSync(
        path.join(process.cwd(), "send-otp-debug.log"),
        JSON.stringify({
          createdRecord: newOtp,
          timestamp: new Date().toISOString(),
          processId: process.pid,
        }, null, 2)
      )
    } catch (err: any) {
      console.error("Failed to write send-otp-debug.log:", err.message)
    }

    // 4. Create the auto-verification magic link
    const magicLink = `${BASE_URL}/api/auth/magic-link?email=${encodeURIComponent(email)}&code=${code}`

    // 5. Send the email using Resend API directly via HTTP fetch
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not defined. Logging OTP and magic link to console:")
      console.warn(`[OTP Code]: ${code} | [Auto-Login Link]: ${magicLink}`)
      return { success: true }
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
        subject: "Your Aura Verification Code",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 0px;">
            <h2 style="font-weight: 300; text-transform: uppercase; letter-spacing: 0.1em; color: #111111;">Aura Minimalist Storefront</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5;">You requested a sign-in verification code for your account.</p>
            
            <div style="margin: 25px 0; background-color: #f9f9f9; padding: 15px; border: 1px solid #eeeeee; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 0.2em; color: #000000;">${code}</span>
            </div>

            <p style="color: #666666; font-size: 14px; line-height: 1.5;">Alternatively, you can click the button below to sign in automatically:</p>
            <div style="margin: 25px 0;">
              <a href="${magicLink}" style="background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.2em; display: inline-block;">Sign In Automatically</a>
            </div>
            
            <p style="color: #999999; font-size: 12px; margin-top: 30px;">This code and link will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
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
    return { success: false, error: error.message || "An error occurred while sending the verification code" }
  }
}

export async function verifyOTP(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !code) {
    return { success: false, error: "Email and code are required" }
  }

  try {
    // Dynamically import Payload to prevent Webpack client-bundling leaks
    const { getPayload } = await import("payload")
    const config = (await import("../../../payload.config")).default
    const payloadInstance = await getPayload({ config })

    // DEBUG: Write all current OTPs in DB to a log file to inspect emails/codes
    try {
      const allOtps = await payloadInstance.find({
        collection: "otps",
        limit: 100,
      })
      const fs = await import("fs")
      const path = await import("path")
      fs.writeFileSync(
        path.join(process.cwd(), "debug-otps.log"),
        JSON.stringify(allOtps.docs, null, 2)
      )
    } catch (debugErr: any) {
      console.error("Failed to write debug-otps.log:", debugErr.message)
    }

    // 1. Retrieve the latest active OTP from Payload database matching email and code
    const { docs } = await payloadInstance.find({
      collection: "otps",
      where: {
        and: [
          { email: { equals: email } },
          { code: { equals: code.trim() } }
        ]
      },
      limit: 1,
    })

    const otpDoc = docs?.[0]
    if (!otpDoc) {
      return { success: false, error: "Invalid verification code." }
    }

    // Verify expiration in JavaScript memory using pure numbers (milliseconds)
    if (Date.now() > otpDoc.expiresAt) {
      return { success: false, error: "Verification code has expired." }
    }

    // 3. Generate storefront signature to authenticate the request to Medusa backend
    const signature = crypto.createHmac("sha256", PAYLOAD_SECRET).update(email).digest("hex")

    // 3. Coordinate with Medusa v2 native session/auth module
    let response
    try {
      response = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
        body: JSON.stringify({ email, signature }),
      })
    } catch (connectionError) {
      console.error("Failed to connect to Medusa backend:", connectionError)
      return { success: false, error: "Connection to authentication server failed. Please check if your Medusa backend is running." }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[DEBUG] Storefront received error response from Medusa:", response.status, errorText);
      try {
        const fs = await import("fs");
        const path = await import("path");
        fs.writeFileSync(
          path.join(process.cwd(), "storefront-error.log"),
          JSON.stringify({
            status: response.status,
            body: errorText,
            timestamp: new Date().toISOString()
          }, null, 2)
        );
      } catch (fsErr) {
        console.error("Failed to write storefront-error.log:", fsErr);
      }
      
      let errorMsg = "Failed to authenticate session with Medusa";
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch (_) {}
      return { success: false, error: errorMsg };
    }

    const { token: medusaToken } = await response.json()

    // 5. Set the authentication token cookie directly under key 'medusa_jwt'
    const nextCookies = await import("next/headers").then((m) => m.cookies)
    const cookieStore = await nextCookies()
    cookieStore.set("medusa_jwt", medusaToken, {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

    // Also call setAuthToken for standard fallback compatibility
    await setAuthToken(medusaToken)

    // Revalidate caches and transfer the cart
    const revalidate = revalidateTag as any
    revalidate("customers")
    try {
      await transferCart()
    } catch (e) {
      console.error("Cart transfer error:", e)
    }

    // 6. Delete the verified OTP record only on successful login
    try {
      await payloadInstance.delete({
        collection: "otps",
        where: {
          id: { equals: otpDoc.id }
        }
      })
    } catch (deleteError) {
      console.error("Failed to delete verified OTP document:", deleteError)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "An error occurred during verification" }
  }
}
