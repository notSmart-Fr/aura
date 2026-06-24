import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/ai-core/src/**/__tests__/**/*.test.ts",
      "apps/storefront/app/**/__tests__/**/*.test.ts",
      "apps/backend/src/**/__tests__/**/*.test.ts",
    ],
  },
});
