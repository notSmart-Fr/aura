import type { HeroBanner } from "../../../../../payload-types"

const defaultHero: HeroBanner = {
  id: 0,
  title: "The Curated Line",
  subtitle: "A study in architectural silhouettes and the luxury of restraint. Explore the Spring/Summer Editorial.",
  imageUrl: "https://lh3.googleusercontent.com/aida/AP1WRLuwXtb5MommkGRY19jGEn8pQuaZlMHj-BB9uASdhIflvjuCMhrAcUdfZn8tXOQXKfYt4A9Wub3yFmScdRloaqJd5iOk5IxEYkcK-NLiyge_4La3AP2PTTsRnVXYhMnaxdWHrP-N1Q41mz5RkMJyxWa6by6eOyHrH0HC2yebaZHSLZuuCdsXO_vapkzContscT6fQ_7DWR5TkkodJEoI_DKnNpbarzLC1hedKi8TALI5yVWwQyil8U0I75yi",
  ctaText: "VIEW COLLECTION",
  ctaLink: "/store",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export default function Hero({ data, locale = "dk" }: { data?: HeroBanner | null; locale?: string }) {
  const hero = data || defaultHero

  const heroImage = (hero as any).image || hero.imageUrl
  const imageSrc = typeof heroImage === 'object' && heroImage !== null
    ? (heroImage as any).url 
    : typeof heroImage === 'string'
      ? (heroImage.startsWith('http') ? heroImage : `/api/media/file/${heroImage}`)
      : '/fallback-placeholder.png';

  return (
    <section className="w-full px-margin-desktop mb-stack-xl">
      <div className="relative w-full h-[85vh] overflow-hidden flex flex-col group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={hero.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={imageSrc}
        />
        <div className="absolute bottom-0 left-0 w-full p-stack-lg flex flex-col md:flex-row justify-between items-start md:items-end bg-transparent gap-4">
          <div className="max-w-xl text-graphite">
            <h1 className="font-display-lg text-display-lg mb-stack-sm text-primary">
              {hero.title}
            </h1>
            {hero.subtitle && (
              <p className="font-body-lg text-body-lg leading-relaxed max-w-md text-primary">
                {hero.subtitle}
              </p>
            )}
          </div>
          <a href={`/${locale}/store`}>
            <button className="bg-primary text-white px-stack-lg py-stack-sm font-label-lg uppercase tracking-widest hover:bg-secondary transition-colors duration-500 sharp-edge">
              {hero.ctaText || "VIEW COLLECTION"}
            </button>
          </a>
        </div>
      </div>
    </section>
  )
}
