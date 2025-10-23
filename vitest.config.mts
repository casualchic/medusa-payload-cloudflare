import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

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
