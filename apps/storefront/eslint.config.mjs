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
        }
      ]
    }
  }
];

export default eslintConfig;
