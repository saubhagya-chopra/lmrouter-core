// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/vitest.setup.ts"],
    // Keep test output readable in CI
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: process.env.CI ? { junit: "reports/junit.xml" } : undefined,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      // tighten later; start loose
      thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
      exclude: [
        "dist/**",
        "**/*.d.ts",
        "tests/**",
        "**/node_modules/**",
        "**/vite.config.*",
        "**/vitest.config.*",
      ],
    },
  },
  // If you use TS path aliases like "@/foo", mirror them here.
  // Example: alias "@" -> "./src"
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
