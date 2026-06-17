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
  )
];

export default eslintConfig;
