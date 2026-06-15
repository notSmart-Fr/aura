import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore build/cache artifacts globally
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**"
    ]
  },

  // Pull in the native Next.js recommended settings
  ...compat.extends("next/core-web-vitals"),
  
  // Inject our custom, un-bypassable AST firewall and suppress harmless warnings
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off"
    },
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "ImportDeclaration[source.value=/\\/db\\/medusa/]",
          "message": "CRITICAL ARCHITECTURAL VIOLATION: Next.js components must never import direct Medusa database handlers. All commerce mutations and queries must flow strictly through the Medusa service API client wrapper."
        },
        {
          "selector": "Property[key.name='access'] Property[key.name=/^(read|update|delete)$/][value.body.value=true]",
          "message": "CRITICAL SECURITY VIOLATION: Wide-open public access controls detected. You are strictly forbidden from assigning an access rule directly to 'true' or an arrow function returning 'true'. You must implement an explicit, authenticated session or user identity check."
        },
        {
          "selector": "Program:has(ExpressionStatement[expression.value='use server']):not(:has(Identifier[name=/^(auth|session|user)$/])) CallExpression[callee.property.name=/^(create|update|delete)$/]",
          "message": "CRITICAL SECURITY VIOLATION: Unprotected Server Action Mutation. Files using 'use server' that execute database mutations must explicitly reference a session, auth, or user variable to enforce ownership validation. Never blindly execute mutations using raw client-side string arguments."
        },
        {
          "selector": "Program:has(ExportNamedDeclaration [id.name='POST']):not(:has(Identifier[name=/^(idempotency|signature|eventId|nonce)$/i])) CallExpression[callee.property.name=/^(update|create|upsert)$/]",
          "message": "CRITICAL ARCHITECTURAL VIOLATION: Unprotected Webhook / Sync Route. Asynchronous event handlers performing mutations must explicitly handle an 'idempotency' key, 'signature', or 'eventId' variable to guard against race conditions, replay attacks, and data drift."
        },
        {
          "selector": "CallExpression[callee.object.name='Promise'][callee.property.name='all'] > ArrayExpression > CallExpression[callee.property.name='map']:has(Identifier[name=/embed/i])",
          "message": "CRITICAL AI ENGINEERING VIOLATION: Rule 5 Concurrency Gate. You are wrapping an open database array mapping directly into Promise.all without a throttle. Use a batching or chunking mechanism to prevent API rate limits."
        }
      ]
    }
  }
];

export default eslintConfig;
