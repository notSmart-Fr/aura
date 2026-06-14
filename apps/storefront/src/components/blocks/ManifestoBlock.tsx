import React from "react"

interface ManifestoBlockProps {
  data: {
    subtitle?: string
    text?: string
  }
}

export function ManifestoBlock({ data }: ManifestoBlockProps) {
  const subtitle = data.subtitle || "MANIFESTO"
  const text = data.text || "Design is the elimination of the unnecessary to reveal the essential."

  return (
    <section className="px-margin-desktop mb-stack-xl text-center flex flex-col items-center bg-white">
      <span className="font-label-md tracking-[0.3em] uppercase text-secondary mb-stack-sm">
        {subtitle}
      </span>
      <h2 className="font-display-lg text-[56px] max-w-4xl leading-tight text-primary">
        {text}
      </h2>
      <div className="w-20 h-px bg-primary my-stack-lg"></div>
    </section>
  )
}
