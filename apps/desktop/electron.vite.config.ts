import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const aliases = {
  '@/app': resolve(__dirname, 'app'),
  '@/lib': resolve(__dirname, 'lib'),
  '@/resources': resolve(__dirname, 'resources'),
  '@shared': resolve(__dirname, '../../packages/shared/dist'),
}
export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@shared', 'ffmpeg-ffprobe-static'],
      }),
    ],
    resolve: {
      alias: aliases,
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'lib/main/main.ts'),
        },
        external: ['chromadb', '@shared', 'onnxruntime-node', '@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe'],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'lib/preload/preload.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: './app',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'app/index.html'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [tailwindcss(), react()],
  },
})
