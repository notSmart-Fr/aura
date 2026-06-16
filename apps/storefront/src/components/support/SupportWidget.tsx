"use client"

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"

interface StatusBannerState {
  message: string
  type: "success" | "error" | "loading"
}

const safeJsonStringify = (val: any) => {
  try {
    const seen = new WeakSet()
    return JSON.stringify(val, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]"
        }
        seen.add(value)
      }
      return value
    }, 2)
  } catch (e) {
    return "[Serialization Error]"
  }
}

export default function SupportWidget() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [isOpen, setIsOpen] = useState(false)
  const [statusBanner, setStatusBanner] = useState<StatusBannerState | null>(null)
  const params = useParams()
  const router = useRouter()
  const countryCode = (params?.countryCode as string) || "us"

  const [input, setInput] = useState("")
  const { messages, sendMessage, stop, addToolResult, error, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/support/chat",
      body: {
        countryCode,
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }: { toolCall: any }) {
      console.log("[SupportWidget onToolCall] Triggered with toolCall:", toolCall)
      if (toolCall.toolName === "modifyCart") {
        const args = toolCall.args || toolCall.input
        if (!args) {
          console.warn("[SupportWidget onToolCall] toolCall.args and toolCall.input are undefined/empty")
          return;
        }
        const { handle, action, quantity, size, color } = args as any
        console.log("[SupportWidget onToolCall] Parsed args:", { handle, action, quantity, size, color })

        setStatusBanner({
          message: `${action === "ADD" ? "Adding" : "Removing"} ${handle}...`,
          type: "loading",
        })

        try {
          console.log("[SupportWidget onToolCall] Fetching /api/store/cart POST with:", {
            handle,
            action,
            quantity,
            countryCode,
            size,
            color,
          })
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
              size,
              color,
            }),
          })
          
          console.log("[SupportWidget onToolCall] Fetch response status:", response.status)
          const data = await response.json()
          console.log("[SupportWidget onToolCall] Fetch response data:", data)

          if (!response.ok) {
            throw new Error(data.error || "Failed to update cart")
          }

          setStatusBanner({
            message: data.message || "Cart updated successfully",
            type: "success",
          })
          setTimeout(() => setStatusBanner(null), 4000)

          console.log("[SupportWidget onToolCall] Refreshing router layout")
          router.refresh()

          console.log("[SupportWidget onToolCall] Calling addToolResult with success state")
          addToolResult({
            tool: 'modifyCart',
            toolCallId: toolCall.toolCallId,
            state: 'output-available',
            output: { success: true, message: data.message },
          })
        } catch (error: any) {
          console.error("[SupportWidget onToolCall] Caught error:", error)
          setStatusBanner({
            message: error.message || "Failed to update cart",
            type: "error",
          })
          setTimeout(() => setStatusBanner(null), 4000)

          console.log("[SupportWidget onToolCall] Calling addToolResult with error state")
          addToolResult({
            tool: 'modifyCart',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: error.message,
          })
        }
      }
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage({ text: input })
      setInput("")
    }
  }

  useEffect(() => {
    if (error) {
      console.error("[SupportWidget State Monitor] Active streaming error:", error)
    }
  }, [messages, error])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  const formatMessageContent = (content: string) => {
    if (!content) return ""
    const boldRegex = /\*\*(.*?)\*\*/g
    const parts = content.split(boldRegex)
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-semibold text-zinc-950">
            {part}
          </strong>
        )
      }
      return part
    })
  }

  if (!mounted) return null

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
              messages.map((m: any) => {
                const isUser = m.role === "user"
                const hasRecommendations = m.parts?.some(
                  (p: any) => p.type === 'tool-showRecommendations' || (p.type === 'tool-call' && p.toolName === 'showRecommendations')
                )

                return (
                  <div key={m.id} className="space-y-2">
                     {m.parts && m.parts.some((p: any) => p.type === 'text') ? (
                        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-none border whitespace-pre-line ${isUser ? "bg-black text-white border-black" : "bg-white text-zinc-900 border-zinc-200"}`}>
                             {(() => {
                               let combinedText = ""
                               m.parts.forEach((part: any) => {
                                 if (part.type === 'text') {
                                   const text = part.text || ""
                                   if (combinedText && !combinedText.endsWith(" ") && !text.startsWith(" ")) {
                                     combinedText += " " + text
                                   } else {
                                     combinedText += text
                                   }
                                 }
                               })
                               return <span>{formatMessageContent(combinedText)}</span>
                             })()}
                          </div>
                        </div>
                    ) : m.content ? (
                      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-none border whitespace-pre-line ${isUser ? "bg-black text-white border-black" : "bg-white text-zinc-900 border-zinc-200"}`}>
                          {formatMessageContent(m.content)}
                        </div>
                      </div>
                    ) : null}
                    {!isUser && m.parts && m.parts.map((part: any, idx: number) => {
                      if (part.type === 'tool-searchCatalog' || (part.type === 'tool-call' && part.toolName === 'searchCatalog')) {
                        if (part.state !== 'output-available' && part.state !== 'result') {
                          return (
                            <div key={idx} className="flex justify-start">
                              <div className="max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-none border bg-white text-zinc-500 border-zinc-200 italic flex items-center gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-none animate-ping" />
                                Searching catalog...
                              </div>
                            </div>
                          )
                        }
                        return null // Suppress raw catalog search output since showRecommendations handles presentation
                      }

                      if (part.type === 'tool-showRecommendations' || (part.type === 'tool-call' && part.toolName === 'showRecommendations')) {
                        if (part.state !== 'output-available' && part.state !== 'result') {
                          // Render animated loading skeleton
                          return (
                            <div key={idx} className="space-y-3 max-w-[85%] mt-2 bg-white p-3 border border-zinc-200 animate-pulse">
                              <div className="h-3 bg-zinc-200 w-3/4 rounded-none" />
                              <div className="flex items-center space-x-3 p-2 bg-zinc-50 border border-zinc-100 rounded-none">
                                <div className="w-12 aspect-[3/4] bg-zinc-200 rounded-none" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 bg-zinc-200 w-1/2 rounded-none" />
                                  <div className="h-2 bg-zinc-200 w-5/6 rounded-none" />
                                </div>
                              </div>
                              <div className="h-3 bg-zinc-200 w-1/2 rounded-none" />
                            </div>
                          )
                        } else {
                          const output = part.output || (part as any).result
                          if (!output || !output.success) return null
                          const { products } = output
                          if (!Array.isArray(products) || products.length === 0) return null

                          return (
                            <div key={idx} className="space-y-2 max-w-[85%] mt-2">
                              {products.map((product: any) => (
                                <div key={product.id} className="bg-white border border-zinc-200 p-2.5 rounded-none flex flex-col gap-2.5 group">
                                  <a
                                    href={`/${countryCode}/products/${product.handle}`}
                                    className="flex items-center space-x-3"
                                  >
                                    {product.thumbnail && (() => {
                                      const src = product.thumbnail.startsWith("/") 
                                        ? `http://localhost:9000${product.thumbnail}` 
                                        : product.thumbnail;
                                      return (
                                        <div className="w-12 aspect-[3/4] overflow-hidden bg-zinc-100 flex-shrink-0 rounded-none relative">
                                          <Image
                                            src={src}
                                            alt={product.title}
                                            fill
                                            className="object-cover rounded-none transition-transform duration-300 group-hover:scale-105"
                                          />
                                        </div>
                                      );
                                    })()}
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
                                  
                                  <div className="flex justify-end border-t border-zinc-100 pt-2">
                                    <button
                                      onClick={async () => {
                                        setStatusBanner({
                                          message: `Adding ${product.title}...`,
                                          type: "loading",
                                        })
                                        try {
                                          const response = await fetch("/api/store/cart", {
                                            method: "POST",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              handle: product.handle,
                                              action: "ADD",
                                              quantity: 1,
                                              countryCode,
                                            }),
                                          })
                                          const data = await response.json()
                                          if (!response.ok) throw new Error(data.error || "Failed to add to cart")
                                          setStatusBanner({
                                            message: data.message || "Added to cart successfully",
                                            type: "success",
                                          })
                                          setTimeout(() => setStatusBanner(null), 4000)
                                          router.refresh()
                                        } catch (err: any) {
                                          setStatusBanner({
                                            message: err.message || "Failed to add to cart",
                                            type: "error",
                                          })
                                          setTimeout(() => setStatusBanner(null), 4000)
                                        }
                                      }}
                                      className="bg-black text-white hover:bg-neutral-900 text-[9px] uppercase tracking-wider font-semibold py-1.5 px-3 rounded-none transition-colors duration-150"
                                    >
                                      Add to Bag
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        }
                      }
                      
                      if (part.type === 'tool-modifyCart' || (part.type === 'tool-call' && part.toolName === 'modifyCart')) {
                        if (part.state !== 'output-available' && part.state !== 'result') {
                          return (
                            <div key={idx} className="flex justify-start">
                              <div className="max-w-[85%] px-3 py-2 text-xs leading-relaxed rounded-none border bg-white text-zinc-500 border-zinc-200 italic flex items-center gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-none animate-ping" />
                                Updating cart...
                              </div>
                            </div>
                          )
                        }
                      }

                      if (part.type === 'tool-call' && part.toolName !== 'searchCatalog' && part.toolName !== 'modifyCart') {
                         return (
                           <div key={idx} className="flex justify-start">
                              <div className="max-w-[85%] px-3 py-2 text-[10px] text-zinc-400 italic bg-transparent">
                                Executing {part.toolName}...
                              </div>
                           </div>
                         )
                      }
                      
                      return null
                    })}
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
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="bg-red-600 hover:bg-red-700 text-white border border-red-600 px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase rounded-none transition-colors duration-200"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-black text-white hover:bg-neutral-900 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:border-zinc-200 border border-black px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase rounded-none transition-colors duration-200"
              >
                Send
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
