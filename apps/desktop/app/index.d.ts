/// <reference types="electron-vite/node" />

import { ConveyorApi } from '@/lib/conveyor/api'

declare global {
  interface Window {
    conveyor: ConveyorApi
  }
}

declare module '*.css' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.web' {
  const content: string
  export default content
}
