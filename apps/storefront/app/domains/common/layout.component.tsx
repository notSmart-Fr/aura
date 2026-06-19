import React from "react";
import { Link, Form } from "@remix-run/react";

interface LayoutProps {
  children: React.ReactNode;
  cartCount?: number;
  searchTerms?: string;
}

export function Layout({ children, cartCount = 0, searchTerms = "" }: LayoutProps) {
  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-zinc-900">
      {/* Top Navigation Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-zinc-200 z-50 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-x-6">
          <Link to="/" className="font-medium tracking-[0.15em] text-xs uppercase text-zinc-900 hover:text-zinc-500 transition-colors">
            Collection
          </Link>
          <Link to="/store" className="font-medium tracking-[0.15em] text-xs uppercase text-zinc-900 hover:text-zinc-500 transition-colors">
            Store
          </Link>
        </div>
        <div className="flex justify-center">
          <Link to="/" className="font-serif tracking-[0.25em] text-xl uppercase font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
            AURA
          </Link>
        </div>
        <div className="flex items-center gap-x-4">
          <Form method="get" action="/" className="relative hidden md:block">
            <input
              type="text"
              name="q"
              defaultValue={searchTerms}
              placeholder="SEARCH CATALOG..."
              className="bg-transparent border border-zinc-200 text-xs px-3 py-1.5 focus:outline-none focus:border-zinc-900 tracking-wider placeholder-zinc-300 w-44 rounded-none"
            />
          </Form>
          <Link to="/cart" className="font-medium tracking-[0.15em] text-xs uppercase text-zinc-900 flex items-center gap-x-1.5 hover:text-zinc-500 transition-colors">
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="bg-zinc-900 text-white text-[9px] px-1.5 py-0.5 rounded-full font-sans font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-16">
        {children}
      </main>

      {/* Luxury Brand Footer */}
      <footer className="bg-white border-t border-zinc-200 py-16 px-6 md:px-12">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <span className="font-serif tracking-[0.2em] text-sm uppercase font-semibold text-zinc-900 block mb-4">AURA</span>
            <p className="text-[11px] text-zinc-500 leading-relaxed tracking-wider">
              Architectural silhouettes, tactile fabrics, and pure material honesty. Made to endure.
            </p>
          </div>
          <div>
            <span className="font-medium tracking-[0.15em] text-[10px] uppercase text-zinc-900 block mb-4">Shop</span>
            <ul className="space-y-2">
              <li>
                <Link to="/store" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">All Products</Link>
              </li>
              <li>
                <Link to="/editorial" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">Editorial</Link>
              </li>
              <li>
                <Link to="/lookbook" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">Lookbook</Link>
              </li>
            </ul>
          </div>
          <div>
            <span className="font-medium tracking-[0.15em] text-[10px] uppercase text-zinc-900 block mb-4">Account</span>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">Dashboard</Link>
              </li>
              <li>
                <Link to="/login" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">Login / Register</Link>
              </li>
            </ul>
          </div>
          <div>
            <span className="font-medium tracking-[0.15em] text-[10px] uppercase text-zinc-900 block mb-4">Customer Care</span>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">FAQ</Link>
              </li>
              <li>
                <Link to="/terms" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[10px] tracking-wider text-zinc-500 hover:text-zinc-950 uppercase transition-colors">Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center border-t border-zinc-100 pt-8 text-[10px] tracking-[0.2em] uppercase text-zinc-400">
          &copy; {new Date().getFullYear()} AURA. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}
