"use client"

import { useState, useEffect } from "react"
import SearchModal from "@/components/search/SearchModal"

export default function SearchTrigger() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="hover:opacity-70 transition-opacity flex items-center gap-2 text-primary focus:outline-none"
        aria-label="Open Search"
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
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden small:inline font-label-md tracking-[0.2em] text-secondary text-[10px]">
          ⌘K
        </span>
      </button>

      {isOpen && (
        <SearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}
