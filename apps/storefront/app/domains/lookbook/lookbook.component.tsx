import React from "react";

export function LookbookComponent() {
  const looks = [
    {
      id: "look-1",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
      title: "LOOK 01",
      description: "Structured cotton mockneck paired with sharp twill trousers."
    },
    {
      id: "look-2",
      image: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=800&auto=format&fit=crop",
      title: "LOOK 02",
      description: "Architectural overcoat drape in double-face wool finish."
    },
    {
      id: "look-3",
      image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=800&auto=format&fit=crop",
      title: "LOOK 03",
      description: "Muted slate gray sweatshirt and sweatpants coordinates."
    },
    {
      id: "look-4",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop",
      title: "LOOK 04",
      description: "Organic lightweight linen structure shirt configuration."
    }
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 space-y-16">
      <div className="text-center mb-12">
        <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] block mb-2">
          AURA Lookbook
        </span>
        <h1 className="font-serif text-3xl font-light text-zinc-900 uppercase tracking-wide">
          Silhouettes: Volume II
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {looks.map((look, i) => (
          <div
            key={look.id}
            className={`space-y-4 flex flex-col ${
              i % 2 === 1 ? "md:translate-y-12" : ""
            }`}
          >
            <div className="relative aspect-[3/4] bg-zinc-100 overflow-hidden group">
              <img
                src={look.image}
                alt={look.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold tracking-wider text-zinc-950 uppercase">
                  {look.title}
                </span>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                  {look.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="h-12 hidden md:block"></div> {/* Bottom spacing corrector for translated columns */}
    </div>
  );
}
