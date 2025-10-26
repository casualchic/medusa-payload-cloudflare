import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Vitest configuration for GitHub workflow tests.
 *
 * These tests validate GitHub Actions workflow files (.github/workflows/*.yml)
 * to ensure CI/CD configuration is correct.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/workflows/**/*.test.ts'],
    globals: true,
  },
})
