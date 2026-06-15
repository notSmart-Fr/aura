"use client"

import { useChat } from "ai/react"
import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"

interface StatusBannerState {
  message: string
  type: "success" | "error" | "loading"
}

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [statusBanner, setStatusBanner] = useState<StatusBannerState | null>(null)
  const params = useParams()
  const router = useRouter()
  const countryCode = (params?.countryCode as string) || "us"

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/support/chat",
    maxSteps: 5,
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "modifyCart") {
        const { handle, action, quantity } = toolCall.args as any
        
        setStatusBanner({
          message: `${action === "ADD" ? "Adding" : "Removing"} ${handle}...`,
          type: "loading",
        })

        try {
          const response = await fetch("/api/store/cart", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              handle,
              action,
              quantity,
              countryCode,
            }),
          })
          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.error || "Failed to update cart")
          }

          setStatusBanner({
            message: data.message || "Cart updated successfully",
            type: "success",
          })
          setTimeout(() => setStatusBanner(null), 4000)

          // Refresh current page layout to update the navbar cart badge
          router.refresh()

          return JSON.stringify({ success: true, message: data.message })
        } catch (error: any) {
          console.error("Cart action error:", error)
          setStatusBanner({
            message: error.message || "Failed to update cart",
            type: "error",
          })
          setTimeout(() => setStatusBanner(null), 4000)

          return JSON.stringify({ success: false, error: error.message })
        }
      }
    },
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white hover:bg-neutral-900 border border-black px-5 py-3 tracking-[0.15em] text-xs font-medium uppercase rounded-none transition-colors duration-200 shadow-sm"
        >
          Support
        </button>
      ) : (
        <div className="w-80 md:w-96 h-[480px] bg-white border border-black flex flex-col rounded-none shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-black bg-white">
            <span className="font-medium tracking-[0.15em] text-xs uppercase text-zinc-900">
              Customer Support
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-black transition-colors text-sm uppercase tracking-wider font-medium"
            >
              Close
            </button>
          </div>

          {/* Real-time Cart Status Banner */}
          {statusBanner && (
            <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 text-[10px] uppercase tracking-wider text-zinc-900 flex justify-between items-center transition-all duration-200 animate-in fade-in">
              <span className="font-medium flex items-center gap-1.5">
                {statusBanner.type === "loading" && (
                  <span className="inline-block w-1.5 h-1.5 bg-black rounded-none animate-ping" />
                )}
                {statusBanner.message}
              </span>
              {statusBanner.type !== "loading" && (
                <button
                  onClick={() => setStatusBanner(null)}
                  className="text-zinc-400 hover:text-black transition-colors text-[9px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
            {messages.length === 0 ? (
              <div className="text-zinc-500 text-xs tracking-wide text-center mt-12 font-medium">
                How can we assist you today?
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "user"
                const searchCatalogResult = m.toolInvocations?.find(
                  (tool) => tool.toolName === "searchCatalog" && tool.state === "result"
                )

                return (
                  <div key={m.id} className="space-y-2">
                    {m.content && (
                      <div
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-none border ${
                             isUser
                              ? "bg-black text-white border-black"
                              : "bg-white text-zinc-900 border-zinc-200"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    )}

                    {!isUser && searchCatalogResult?.state === "result" && (
                      <div className="space-y-2 max-w-[85%]">
                        {Array.isArray(searchCatalogResult.result) &&
                          searchCatalogResult.result.map((product: any) => (
                            <a
                              key={product.product_id}
                              href={`/${countryCode}/products/${product.handle}`}
                              className="flex items-center space-x-3 p-2 bg-white border border-zinc-200 hover:border-zinc-900 transition-colors duration-200 rounded-none group"
                            >
                              {product.thumbnail && (
                                <div className="w-12 aspect-[3/4] overflow-hidden bg-zinc-100 flex-shrink-0 rounded-none relative">
                                  <Image
                                    src={product.thumbnail}
                                    alt={product.title}
                                    fill
                                    className="object-cover rounded-none transition-transform duration-300 group-hover:scale-105"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[10px] font-sans font-medium text-zinc-900 truncate uppercase tracking-wider">
                                  {product.title}
                                </h4>
                                {product.description && (
                                  <p className="text-[10px] font-sans text-zinc-500 truncate mt-0.5">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-zinc-500 border border-zinc-200 px-3 py-2 text-xs rounded-none flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-black bg-white flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question..."
              className="flex-1 border border-zinc-200 px-3 py-2 text-xs rounded-none bg-white text-black placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-black text-white hover:bg-neutral-900 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:border-zinc-200 border border-black px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase rounded-none transition-colors duration-200"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
