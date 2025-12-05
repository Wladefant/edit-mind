# Tech Stack & Dependencies

## Frontend (Web/Desktop)

*   **Framework**: React 19
*   **Routing**: React Router v7
*   **Styling**: Tailwind CSS v4, Radix UI, Lucide React (icons)
*   **Animation**: Framer Motion
*   **State/Data**: React Query (implied or loader pattern in RR7)
*   **Build**: Vite

## Backend (Node.js)

*   **Runtime**: Node.js (TS)
*   **Server**: Express (background-jobs)
*   **Queue**: BullMQ + Redis
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Validation**: Zod

## Backend (Python)

*   **Runtime**: Python 3.10+
*   **ML Frameworks**: PyTorch, Ultralytics (YOLO), Transformers (Hugging Face)
*   **Audio**: Faster-Whisper
*   **Vision**: OpenCV (`opencv-python`), `face_recognition`, `dlib`
*   **Websockets**: `websockets` lib

## Desktop

*   **Wrapper**: Electron
*   **Builder**: Electron Builder
*   **Bridge**: IPC (Inter-Process Communication)

## Infrastructure

*   **Containerization**: Docker & Docker Compose (for DB/Redis)
*   **Package Manager**: pnpm
