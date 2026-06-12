import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  return (
    <footer className="w-full px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-center gap-stack-sm border-t border-primary bg-white mt-auto">
      <LocalizedClientLink
        href="/"
        className="font-display-lg text-display-lg text-primary uppercase"
      >
        AURA
      </LocalizedClientLink>
      <div className="flex flex-col md:flex-row items-center gap-stack-md">
        <LocalizedClientLink
          className="font-label-md text-label-md tracking-[0.2em] uppercase text-secondary hover:text-primary transition-colors"
          href="#"
        >
          LEGAL
        </LocalizedClientLink>
        <LocalizedClientLink
          className="font-label-md text-label-md tracking-[0.2em] uppercase text-secondary hover:text-primary transition-colors"
          href="#"
        >
          PRIVACY
        </LocalizedClientLink>
        <LocalizedClientLink
          className="font-label-md text-label-md tracking-[0.2em] uppercase text-secondary hover:text-primary transition-colors"
          href="#"
        >
          CAREERS
        </LocalizedClientLink>
        <LocalizedClientLink
          className="font-label-md text-label-md tracking-[0.2em] uppercase text-secondary hover:text-primary transition-colors"
          href="#"
        >
          CONTACT
        </LocalizedClientLink>
      </div>
      <div className="font-label-md text-label-md tracking-[0.2em] uppercase text-secondary">
        © {new Date().getFullYear()} AURA. ALL RIGHTS RESERVED.
      </div>
    </footer>
  )
}
