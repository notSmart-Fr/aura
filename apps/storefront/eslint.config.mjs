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

  // Lightweight style and typescript rules only - architectural firewalls are handled at root-level
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ),

  // Strict guardrails to prevent agent bypasses/laziness
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description"
        }
      ]
    }
  }
];

export default eslintConfig;
