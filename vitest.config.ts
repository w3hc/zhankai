import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: ["node_modules/", "dist/", "tests/"],
    },
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
