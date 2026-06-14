import React from "react"

interface HeroBlockProps {
  data: {
    title: string
    description?: string
    image?: string | { url?: string } | null
    buttonText?: string
    buttonLink?: string
  }
  locale: string
}

export function HeroBlock({ data, locale }: HeroBlockProps) {
  // Safe structural unpacking for Payload Media types
  let imageUrl = ""
  if (data?.image && typeof data.image === "object" && "url" in data.image && data.image.url) {
    imageUrl = data.image.url
  } else if (typeof data.image === "string" && data.image !== "") {
    imageUrl = data.image
  }

  // Explicitly intercept empty string states ("") and assign the default Unsplash alien landscape photo fallback
  if (!imageUrl || imageUrl === "") {
    imageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
  }

  const ctaLink = data.buttonLink || "/store"
  const linkHref = ctaLink.startsWith("/") ? `/${locale}${ctaLink}` : `/${locale}/${ctaLink}`

  return (
    <section className="w-full px-margin-desktop mb-stack-xl">
      <div className="relative w-full h-[85vh] overflow-hidden flex flex-col group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          alt={data.title || "Hero Image"} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          src={imageUrl} 
        />
        <div className="absolute bottom-0 left-0 w-full p-stack-lg flex flex-col md:flex-row justify-between items-start md:items-end bg-transparent gap-4">
          <div className="max-w-xl text-graphite">
            <h1 className="font-display-lg text-display-lg mb-stack-sm text-primary">{data.title}</h1>
            {data.description && (
              <p className="font-body-lg text-body-lg leading-relaxed max-w-md text-primary">{data.description}</p>
            )}
          </div>
          <a href={linkHref}>
            <button className="bg-primary text-white px-stack-lg py-stack-sm font-label-lg uppercase tracking-widest hover:bg-secondary transition-colors duration-500 sharp-edge">
              {data.buttonText || "Shop Now"}
            </button>
          </a>
        </div>
      </div>
    </section>
  )
}
