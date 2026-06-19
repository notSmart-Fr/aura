import React from "react";
import { Form, useNavigation } from "@remix-run/react";

interface AuthComponentProps {
  actionData?: { error?: string };
}

export function AuthComponent({ actionData }: AuthComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] block mb-2">
          AURA Customer Registry
        </span>
        <h1 className="font-serif text-3xl font-light text-zinc-900 uppercase">
          Sign In
        </h1>
      </div>

      <Form method="post" className="space-y-6">
        <div>
          <label htmlFor="email" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none placeholder-zinc-300"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            required
            className="w-full bg-white border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none focus:border-zinc-900 rounded-none"
          />
        </div>

        {actionData?.error && (
          <p className="text-red-500 text-xxs tracking-wider uppercase">{actionData.error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-zinc-950 text-white text-xs tracking-[0.2em] uppercase font-semibold py-4 hover:bg-zinc-900 transition-colors duration-300 rounded-none disabled:bg-zinc-300"
        >
          {isSubmitting ? "Verifying..." : "Sign In"}
        </button>
      </Form>
    </div>
  );
}
