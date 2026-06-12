import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { EB_Garamond, Hanken_Grotesk } from "next/font/google"
import AdminShortcutListener from "@modules/common/components/admin-shortcut-listener"
import "styles/globals.css"

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-eb-garamond",
  display: "swap",
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hanken-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${ebGaramond.variable} ${hankenGrotesk.variable}`}
    >
      <body className="font-body-md text-body-md overflow-x-hidden bg-white text-black antialiased">
        <main className="relative">{props.children}</main>
        <AdminShortcutListener />
      </body>
    </html>
  )
}
