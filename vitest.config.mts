import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Vitest configuration for integration tests.
 *
 * Integration tests validate API endpoints and backend services.
 * For workflow tests, see vitest.workflows.config.mts
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Use node environment for API integration tests (not jsdom)
    // jsdom is for UI component tests, node is for API/backend tests
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    globals: true,
    hookTimeout: 30000, // Increase hook timeout for slow Payload init
  },
})