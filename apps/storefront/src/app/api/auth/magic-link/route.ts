import { NextRequest, NextResponse } from "next/server"
import { verifyMagicLinkToken } from "@lib/data/magic-link"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/account?error=No+token+provided", request.url))
  }

  const result = await verifyMagicLinkToken(token)

  if (!result.success) {
    const errorMsg = encodeURIComponent(result.error || "Invalid or expired magic link token")
    return NextResponse.redirect(new URL(`/account?error=${errorMsg}`, request.url))
  }

  // Redirect to account dashboard (the proxy middleware will dynamically prefix with the country code)
  return NextResponse.redirect(new URL("/account", request.url))
}
