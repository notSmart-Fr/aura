"use client"

import { useState, useEffect, useRef } from "react"
import SearchResultCard from "@/components/search/SearchResultCard"

interface SearchResultProduct {
  product_id: string
  handle: string
  title: string
  distance: number
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<SearchResultProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      // Disable body scroll when modal is open
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Keypress listener inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [query])

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const fetchResults = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: debouncedQuery }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || "Failed to fetch search results")
        }

        const data = await response.json()
        setResults(data)
      } catch (err: any) {
        setError(err.message || "An error occurred while searching")
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-start bg-black/40">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal content container */}
      <div className="relative w-full max-w-2xl bg-white border border-primary mt-20 mx-margin-mobile small:mx-margin-tablet medium:mx-margin-desktop rounded-none flex flex-col max-h-[75vh]">
        {/* Search header / input */}
        <div className="flex items-center border-b border-primary p-4 gap-3 bg-white">
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
            className="w-5 h-5 text-secondary"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="TYPE TO SEARCH..."
            className="w-full bg-white text-primary placeholder-secondary font-label-lg text-label-lg tracking-wider focus:outline-none uppercase"
          />
          <button
            onClick={onClose}
            className="font-label-md text-secondary hover:text-black uppercase text-[10px] tracking-wider ml-auto focus:outline-none"
          >
            [ESC]
          </button>
        </div>

        {/* Results/Status Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {loading && (
            <div className="py-8 text-center bg-white">
              <span className="font-label-md text-secondary tracking-widest uppercase text-[10px] animate-pulse">
                Searching Catalog...
              </span>
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-red-600 bg-white">
              <span className="font-label-md tracking-wider uppercase text-[10px]">
                {error}
              </span>
            </div>
          )}

          {!loading && !error && query.trim() !== "" && results.length === 0 && (
            <div className="py-8 text-center bg-white">
              <span className="font-label-md text-secondary tracking-widest uppercase text-[10px]">
                No items found
              </span>
            </div>
          )}

          {!loading && !error && query.trim() === "" && (
            <div className="py-8 text-center bg-white">
              <span className="font-label-md text-secondary tracking-widest uppercase text-[10px]">
                Type query to see suggestions...
              </span>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="grid grid-cols-1 gap-3 bg-white">
              {results.map((product) => (
                <SearchResultCard
                  key={product.product_id}
                  product={product}
                  onSelect={onClose}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
