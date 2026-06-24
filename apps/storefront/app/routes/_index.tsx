import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import React, { useState, useEffect, useRef } from "react";
import { Layout } from "../domains/common/layout.component";
import { DatabaseDomainError, IntegrationError } from "../domains/common/errors";
import {
  fetchActiveOrder,
  fetchProducts,
  searchProducts,
  type CatalogProductPreview,
} from "../domains/catalog/catalog.queries";
import { getSessionToken, getOrCreateChatUserId } from "../domains/common/session.server";
import { processWebIntent } from "../domains/orchestrator/web-orchestrator.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchTerms = url.searchParams.get("q") || "";

  let products: CatalogProductPreview[] = [];
  let isSearch = false;

  if (searchTerms) {
    isSearch = true;
    try {
      products = await searchProducts(searchTerms, 4);
    } catch (e: unknown) {
      console.error("Vector search failed, falling back to standard list:", e);
    }
  }

  if (products.length === 0) {
    try {
      products = await fetchProducts(4);
    } catch (e: unknown) {
      console.error("Failed to load products:", e);
    }
  }

  // If still empty (e.g. backend is not running yet), load default fallback items matching the AURA aesthetic
  if (products.length === 0) {
    products = [
      {
        id: "fallback-1",
        name: "ARCHITECTURAL OVERCOAT",
        slug: "architectural-overcoat",
        description: "Heavy tailored profile coat structured from raw double-face wool.",
        thumbnail: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=640&auto=format&fit=crop",
        price: 890.0,
      },
      {
        id: "fallback-2",
        name: "RIBBED MOCKNECK KNIT",
        slug: "ribbed-mockneck-knit",
        description: "Extrafine merino mockneck knit with seamless clean edges.",
        thumbnail: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=640&auto=format&fit=crop",
        price: 240.0,
      },
      {
        id: "fallback-3",
        name: "STRUCTURED TWILL TROUSER",
        slug: "structured-twill-trouser",
        description: "Mid-rise, straight leg trouser with clean front creases.",
        thumbnail: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=640&auto=format&fit=crop",
        price: 320.0,
      },
      {
        id: "fallback-4",
        name: "ESSENTIAL LINEN SHIRT",
        slug: "essential-linen-shirt",
        description: "Relaxed linen shirt with structured pointed collar and cuffs.",
        thumbnail: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=640&auto=format&fit=crop",
        price: 180.0,
      }
    ];
  }

  const sessionToken = await getSessionToken(request);
  const activeOrder = await fetchActiveOrder(sessionToken);

  return json({
    products,
    isSearch,
    searchTerms,
    cartCount: activeOrder?.totalQuantity || 0,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message") as string;
  if (!message) {
    return json({ error: "Message is required" }, { status: 400 });
  }

  const { userId: platformUserId, headers: sessionHeaders } =
    await getOrCreateChatUserId(request);

  try {
    const response = await processWebIntent({
      text: message,
      platformUserId,
    });

    const responsePayload = {
      message,
      text: response.text,
      toolResults: response.toolResults,
      fromCache: response.fromCache ?? false,
    };

    if (sessionHeaders) {
      return json(responsePayload, { headers: sessionHeaders });
    }

    return json(responsePayload);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error instanceof IntegrationError || error instanceof DatabaseDomainError) {
        console.error("Agent boundary error:", error.code, error.meta);
        return json({ error: error.message, code: error.code }, { status: 500 });
      }
      console.error("Agent generate error:", error);
      return json({ error: error.message }, { status: 500 });
    }
    return json({ error: "Failed to generate agent response" }, { status: 500 });
  }
}

export default function HomePage() {
  const { products, isSearch, searchTerms, cartCount } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [chatOpen, setChatOpen] = useState(false);
  interface MessageProduct {
    id: string;
    title: string;
    handle: string;
    description: string;
    thumbnail?: string | null;
  }

  interface Message {
    sender: "user" | "agent";
    text: string;
    data?: {
      products?: MessageProduct[];
    };
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "agent",
      text: "Welcome to AURA. I am your design and style concierge. Ask me about our architectural silhouettes or ask me to search the catalog."
    }
  ]);

  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Capture response from action
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      interface FetcherData {
        text?: string;
        error?: string;
        code?: string;
        toolResults?: Array<{
          result?: {
            products?: MessageProduct[];
          };
        }>;
      }
      const data = fetcher.data as FetcherData;
      if (data.text || data.toolResults) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "agent",
            text: data.text || "Here is what I found:",
            data: data.toolResults?.[0]?.result // Capture tool results if present
          }
        ]);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "agent",
            text: `[${data.code ?? "ERROR"}] ${data.error}`,
          }
        ]);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const currentMsg = inputVal;
    setInputVal("");

    setMessages((prev) => [...prev, { sender: "user", text: currentMsg }]);

    const fd = new FormData();
    fd.append("message", currentMsg);
    fetcher.submit(fd, { method: "POST" });
  };

  return (
    <Layout cartCount={cartCount} searchTerms={searchTerms}>
        {/* 3B. Editorial Campaign Hero */}
        <section className="relative h-[85vh] bg-zinc-100 overflow-hidden group">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1920&auto=format&fit=crop"
              alt="Editorial campaign"
              className="w-full h-full object-cover transition-transform duration-[700ms] group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-black/5" />
          <div className="absolute bottom-12 left-6 md:left-12 max-w-lg text-white">
            <span className="font-medium tracking-[0.2em] text-xxs uppercase block mb-2 text-white/80">Spring / Summer Editorial</span>
            <h1 className="font-serif text-[40px] md:text-[56px] leading-[1.1] font-light mb-4 text-white">
              The Luxury of Restraint
            </h1>
            <p className="font-sans text-xs md:text-sm text-white/80 mb-6 leading-relaxed max-w-sm">
              A study in architectural silhouettes, tactile fabrics, and natural muted tones.
            </p>
            <Link
              to="/store"
              className="inline-block bg-white text-zinc-900 text-[10px] tracking-[0.2em] uppercase font-semibold px-6 py-3 hover:bg-zinc-900 hover:text-white transition-colors duration-300 rounded-none"
            >
              View Collection
            </Link>
          </div>
        </section>

        {/* 3E. Manifesto Brand Narrative */}
        <section className="py-24 px-6 text-center max-w-3xl mx-auto">
          <h2 className="font-serif text-[28px] md:text-[36px] font-normal leading-relaxed text-zinc-900 mb-6">
            "We believe in creating foundation garments designed to endure, focusing on spatial geometry, clean construction, and pure high-end tactile quality."
          </h2>
          <div className="w-16 h-px bg-zinc-950 mx-auto" />
        </section>

        {/* 3D. Hairline Divided Product Rows */}
        <section className="border-t border-b border-zinc-200">
          <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200">
            <h3 className="font-medium tracking-[0.15em] text-xs uppercase text-zinc-900">
              {isSearch ? `Search Results for "${searchTerms}"` : "Featured Items"}
            </h3>
            {isSearch && (
              <a href="/" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase border-b border-zinc-400 pb-0.5">
                Clear search
              </a>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
            {products.map((product) => (
              <div key={product.id} className="group flex flex-col bg-white">
                {/* Product Image Wrapper - strict aspect ratio, scale transition, no desaturation */}
                <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                  <img
                    src={product.thumbnail || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=640&auto=format&fit=crop"}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-[700ms] group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex flex-col justify-between flex-grow min-h-[120px] border-t border-zinc-100">
                  <div className="flex justify-between items-start gap-x-2">
                    <div>
                      <Link
                        to={`/us/products/${product.slug}`}
                        className="font-medium tracking-[0.1em] text-xs uppercase hover:underline text-zinc-900"
                      >
                        {product.name}
                      </Link>
                      <p className="text-[10px] text-zinc-400 mt-1 uppercase">Cotton / Wool Blend</p>
                    </div>
                    <span className="font-sans text-xs font-semibold text-zinc-900">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3C. Asymmetrical Architectural Grid */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12">
            {/* Col 1 (Large Image) - Aspect 3/4 */}
            <div className="md:col-span-7 flex flex-col">
              <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100 mb-6">
                <img
                  src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=1200&auto=format&fit=crop"
                  alt="Architectural silhouette"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium tracking-[0.2em] text-[10px] text-zinc-400 uppercase mb-2">LOOKBOOK DETAILS</span>
              <h4 className="font-serif text-2xl font-light mb-4">Precision Tailoring</h4>
              <p className="font-sans text-xs text-zinc-600 leading-relaxed max-w-md">
                Every hem, shoulder profile, and seam is constructed in our workspace to shape a sharp architectural frame while maintaining absolute comfort.
              </p>
            </div>

            {/* Col 2 (Split Content) */}
            <div className="md:col-span-5 flex flex-col justify-between">
              <div className="py-12 border-t border-zinc-200">
                <h5 className="font-medium tracking-[0.2em] text-xs uppercase mb-4 text-zinc-900">Editorial Narrative</h5>
                <p className="font-sans text-xs text-zinc-600 leading-relaxed mb-6">
                  “Aura is a space where architecture meets fabric. We eliminate the noise, strips away the superfluous, and leaves only the pure silhouette. We believe in visual clarity and the ultimate expression of material honesty.”
                </p>
                <Link to="/editorial" className="text-xs uppercase font-semibold border-b border-zinc-950 pb-1 hover:opacity-60 transition-opacity">
                  Explore Editorial
                </Link>
              </div>
              {/* Aspect Video (16:9) image */}
              <div className="relative aspect-video overflow-hidden bg-zinc-100">
                <img
                  src="https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800&auto=format&fit=crop"
                  alt="Fabric texture"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      {/* support chat concierge widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className="bg-zinc-950 text-white p-4 shadow-lg hover:bg-zinc-900 transition-colors flex items-center gap-x-2 rounded-none"
          >
            <span className="text-xs font-semibold tracking-widest uppercase">AURA CONCIERGE</span>
          </button>
        ) : (
          <div className="w-80 md:w-96 bg-white border border-zinc-900 shadow-2xl flex flex-col rounded-none h-[450px]">
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 bg-zinc-950 text-white flex justify-between items-center">
              <span className="text-xs font-semibold tracking-widest uppercase">CONCIERGE ASSISTANT</span>
              <button onClick={() => setChatOpen(false)} className="text-white hover:text-zinc-300 text-xs">
                &times; CLOSE
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-3 text-xs leading-relaxed max-w-[85%] ${
                      msg.sender === "user"
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-900 border border-zinc-200"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {/* Render tool results natively in the UI */}
                    {msg.data && msg.sender === "agent" && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-3">
                        {msg.data.products && msg.data.products.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {msg.data.products.map((p: MessageProduct) => (
                              <div key={p.id} className="border border-zinc-100 p-2 flex flex-col bg-white">
                                {/* Next.js Image fill fallback -> absolute w-full h-full object-cover inside relative rounded-none */}
                                <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-50 rounded-none mb-1">
                                  <img
                                    src={p.thumbnail || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=150&auto=format&fit=crop"}
                                    alt={p.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                  />
                                </div>
                                <a
                                  href={`/us/products/${p.handle}`}
                                  className="text-[9px] uppercase tracking-wider font-semibold truncate hover:underline block text-zinc-900"
                                >
                                  {p.title}
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-zinc-400">No items resolved.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 flex gap-x-2 bg-white">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={fetcher.state !== "idle" ? "CONCIERGE SEARCHING..." : "ASK AURA ASSISTANT..."}
                disabled={fetcher.state !== "idle"}
                className="flex-1 border border-zinc-200 text-xs px-3 py-2 focus:outline-none focus:border-zinc-950 placeholder-zinc-300 rounded-none"
              />
              <button
                type="submit"
                disabled={fetcher.state !== "idle" || !inputVal.trim()}
                className="bg-zinc-950 text-white px-4 py-2 text-xs font-semibold tracking-wider hover:bg-zinc-900 transition-colors disabled:bg-zinc-300 rounded-none"
              >
                SEND
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
