import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      '@background-jobs': path.resolve(__dirname, '../../apps/background-jobs'),
      '@shared': path.resolve(__dirname, '../../packages/shared'),
      '@/app': path.resolve(__dirname, './app'),
    },
  },
})
