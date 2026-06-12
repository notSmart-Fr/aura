"use client"

import React, { useRef, useState, useEffect } from "react"
import { ArrowLeft, ArrowRight } from "@medusajs/icons"
import { Heading, clx } from "@modules/common/components/ui"

interface ProductCarouselProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function ProductCarousel({
  title,
  subtitle,
  children,
}: ProductCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollLimits = () => {
    const el = containerRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      // We use a small threshold to guard against fractional sub-pixel rounding differences
      setCanScrollLeft(scrollLeft > 2)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2)
    }
  }

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: -400,
        behavior: "smooth",
      })
    }
  }

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: 400,
        behavior: "smooth",
      })
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (el) {
      checkScrollLimits()

      const handleResize = () => checkScrollLimits()
      
      // Observe resize events on the container to dynamically adjust arrows
      const observer = new ResizeObserver(handleResize)
      observer.observe(el)

      return () => {
        observer.disconnect()
      }
    }
  }, [children])

  return (
    <div className="flex flex-col gap-8">
      {/* Header section with title and arrows above the carousel */}
      <div className="flex justify-between items-end border-b border-zinc-200 pb-4">
        <div className="flex flex-col gap-2">
          {subtitle && (
            <span className="text-xs tracking-widest text-zinc-500 uppercase font-light">
              {subtitle}
            </span>
          )}
          <Heading
            level="h2"
            className="text-2xl text-zinc-900 font-extralight tracking-wider uppercase"
          >
            {title}
          </Heading>
        </div>

        {/* Minimalist Navigation Buttons */}
        <div className="flex gap-2">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={clx(
              "p-2 border transition-all duration-300 rounded-none focus:outline-none flex items-center justify-center",
              canScrollLeft
                ? "bg-zinc-900 border-zinc-900 text-zinc-50 hover:bg-zinc-800 hover:scale-110 active:scale-95 cursor-pointer"
                : "bg-zinc-100 border-zinc-200 text-zinc-400 opacity-50 cursor-not-allowed"
            )}
            aria-label="Previous products"
          >
            <ArrowLeft />
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={clx(
              "p-2 border transition-all duration-300 rounded-none focus:outline-none flex items-center justify-center",
              canScrollRight
                ? "bg-zinc-900 border-zinc-900 text-zinc-50 hover:bg-zinc-800 hover:scale-110 active:scale-95 cursor-pointer"
                : "bg-zinc-100 border-zinc-200 text-zinc-400 opacity-50 cursor-not-allowed"
            )}
            aria-label="Next products"
          >
            <ArrowRight />
          </button>
        </div>
      </div>

      {/* Swipeable snap container */}
      <div
        ref={containerRef}
        onScroll={checkScrollLimits}
        className="w-full overflow-x-auto scroll-smooth snap-x snap-mandatory flex gap-6 no-scrollbar pb-4"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>
    </div>
  )
}

