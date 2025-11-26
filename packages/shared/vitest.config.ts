import { defineConfig } from 'vitest/config'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../.env.testing') })

export default defineConfig({
  test: {
    globals: true,
    logHeapUsage: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.spec.ts', '**/*.test.ts'],
    },
    testTimeout: 300000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname),
    },
  },
})
