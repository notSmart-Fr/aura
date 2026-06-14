import { NextRequest, NextResponse } from "next/server"
import { verifyOTP } from "@lib/data/magic-link"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")
  const code = searchParams.get("code")

  if (!email || !code) {
    return NextResponse.redirect(new URL("/account?error=Invalid+sign-in+link", request.url))
  }

  const result = await verifyOTP(email, code)

  if (!result.success) {
    const errorMsg = encodeURIComponent(result.error || "Invalid or expired verification code")
    return NextResponse.redirect(new URL(`/account?error=${errorMsg}`, request.url))
  }

  // Redirect to account dashboard (handled dynamically by localized proxy middleware)
  return NextResponse.redirect(new URL("/account", request.url))
}
