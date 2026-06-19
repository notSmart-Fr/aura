import React from "react";

export function EditorialComponent() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 space-y-24">
      {/* Narrative Section */}
      <section className="max-w-3xl mx-auto text-center py-12">
        <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] block mb-4">
          AURA Editorial
        </span>
        <h1 className="font-serif text-4xl md:text-5xl font-light text-zinc-900 mb-6 uppercase tracking-wide leading-tight">
          The Restraint of Material
        </h1>
        <p className="font-sans text-xs md:text-sm text-zinc-500 leading-relaxed uppercase tracking-wider max-w-xl mx-auto">
          A visual research of silhouettes, geometry, and textures. Stripping away the excess to reveal the foundational garment.
        </p>
      </section>

      {/* Editorial Grid */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-5 relative aspect-[3/4] bg-zinc-100 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop"
            alt="Minimal garment silhouette"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="md:col-span-7 space-y-6 md:pl-12">
          <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] block">
            Chapter I
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-light text-zinc-900 uppercase tracking-wide">
            Tactile Honesty
          </h2>
          <p className="font-sans text-xs text-zinc-600 leading-relaxed">
            Our fabrics are sourced with strict dedication to tactile experience. Raw double-face wool, extrafine long-staple cotton, and organic linen. Every weave must speak for itself without decoration or pattern.
          </p>
        </div>
      </section>

      {/* Asymmetric Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 space-y-6 md:pr-12 order-2 md:order-1">
          <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] block">
            Chapter II
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-light text-zinc-900 uppercase tracking-wide">
            Spatial Geometry
          </h2>
          <p className="font-sans text-xs text-zinc-600 leading-relaxed">
            We draft patterns like architects design structures. The relationship between the body, fabric weight, and negative space determines the silhouette. Seams are placed along structural gridlines to reinforce the frame.
          </p>
        </div>
        <div className="md:col-span-5 relative aspect-[3/4] bg-zinc-100 overflow-hidden order-1 md:order-2">
          <img
            src="https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800&auto=format&fit=crop"
            alt="Structural fabric drape"
            className="w-full h-full object-cover"
          />
        </div>
      </section>
    </div>
  );
}
