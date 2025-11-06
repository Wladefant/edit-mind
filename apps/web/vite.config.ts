import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'), // for web/app/*
      "@shared": path.resolve(__dirname, '../../packages/shared'), // for lib/*
      '@/lib': path.resolve(__dirname, '../lib'), // for @/lib/*
      '@/app': path.resolve(__dirname, './app'), // for @/app/*
    },
  },

  build: {
    rollupOptions: {
      external: [],
    },
  },
})
