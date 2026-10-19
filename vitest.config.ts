import { defineConfig } from 'vitest/config'

// Unit tests only cover framework-free modules, so this config skips the app
// plugins in vite.config.ts and keeps just the `#/*` alias resolution.
// Playwright owns e2e-tests/, hence the narrow include.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
