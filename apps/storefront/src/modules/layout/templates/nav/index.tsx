import { Suspense } from "react"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import { getPayload } from "payload"
import config from "../../../../../payload.config"
import { headers } from "next/headers"
import SearchTrigger from "@/components/search/SearchTrigger"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const isAdmin = !!(user && (user as { role?: string }).role === "admin")

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop py-stack-sm bg-white border-b border-primary h-auto">
      {/* Left side links (desktop) / SideMenu (mobile) */}
      <div className="flex items-center gap-stack-md">
        <div className="small:hidden">
          <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
        </div>
        <div className="hidden small:flex gap-stack-md">
          <LocalizedClientLink
            href="/store"
            className="font-label-lg text-label-lg tracking-[0.15em] uppercase text-primary hover:opacity-70 transition-opacity duration-300"
          >
            COLLECTIONS
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="font-label-lg text-label-lg tracking-[0.15em] uppercase text-primary hover:opacity-70 transition-opacity duration-300"
          >
            EDITORIAL
          </LocalizedClientLink>
          <LocalizedClientLink
            href="#"
            className="font-label-lg text-label-lg tracking-[0.15em] uppercase text-primary hover:opacity-70 transition-opacity duration-300"
          >
            STORES
          </LocalizedClientLink>
          <LocalizedClientLink
            href="#"
            className="font-label-lg text-label-lg tracking-[0.15em] uppercase text-secondary hover:opacity-70 transition-opacity duration-300"
          >
            ARCHIVE
          </LocalizedClientLink>
        </div>
      </div>

      {/* Center Logo */}
      <LocalizedClientLink
        href="/"
        className="absolute left-1/2 -translate-x-1/2 font-display-lg text-display-lg tracking-tighter text-primary uppercase"
        data-testid="nav-store-link"
      >
        Aura
      </LocalizedClientLink>

      {/* Right actions */}
      <div className="flex items-center gap-stack-sm text-primary">
        <SearchTrigger />
        <div className="hidden small:flex items-center">
          <LocalizedClientLink
            className="hover:opacity-70 flex items-center"
            href="/account"
            data-testid="nav-account-link"
            aria-label="Account"
            title="Account"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-black"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </LocalizedClientLink>
        </div>
        <Suspense
          fallback={
            <LocalizedClientLink
              className="hover:opacity-70 flex items-center"
              href="/cart"
              data-testid="nav-cart-link"
              title="Cart"
            >
              <div className="relative flex items-center mr-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-black"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span className="absolute -top-1.5 -right-2.5 bg-white text-zinc-950 text-[9px] font-bold px-1 min-w-[15px] h-[15px] flex items-center justify-center rounded-none border border-zinc-900 leading-none">
                  0
                </span>
              </div>
            </LocalizedClientLink>
          }
        >
          <CartButton />
        </Suspense>
      </div>
    </nav>
  )
}
