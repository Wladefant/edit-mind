# System Architecture

## Overview

`edit-mind` is a local-first, AI-powered video indexing and search platform. It uses a hybrid architecture combining a Node.js/Electron monorepo for the application layer and a Python service for heavy AI processing (transcription, face recognition).

## High-Level Diagram

```mermaid
graph TD
    User[User (Desktop/Web)] -->|Uploads/Watches| Folders[Watched Folders]
    User -->|Queries| WebApp[Web/Desktop App]

    subgraph "Application Layer (Node.js)"
        WebApp -->|Reads/Writes| DB[(PostgreSQL)]
        WebApp -->|Enqueues Jobs| Queue[Redis / BullMQ]
        Background[Background Jobs Worker] -->|Consumes| Queue
        Background -->|Updates| DB
    end

    subgraph "AI Processing Layer (Python)"
        PythonService[Python AI Service]
        Background -->|Websockets| PythonService
        PythonService -->|Transcribe/Analyze| Models[Local AI Models]
        PythonService -->|Results| Background
    end

    subgraph "Search & Storage"
        Background -->|Embeddings| ChromaDB[(ChromaDB / Vector Store)]
        WebApp -->|Search| ChromaDB
    end
```

## Component Breakdown

### 1. Apps (`apps/`)

*   **`desktop`**: Electron-based desktop client. Wraps the web application and handles native file system access (watching folders, reading video files).
    *   *Tech*: Electron, Vite, React 19, Tailwind CSS 4.
*   **`web`**: The main UI logic. Can run as a standalone web app or inside Electron.
    *   *Tech*: React Router v7, React 19, Tailwind CSS 4, Prisma Client.
    *   *Responsibility*: UI rendering, Chat interface, Video player, Search interface.
*   **`background-jobs`**: The worker service responsible for processing video files.
    *   *Tech*: Node.js, Express, BullMQ, Redis.
    *   *Responsibility*: Managing the job queue, coordinating with the Python service, updating job status in Postgres.

### 2. Packages (`packages/`)

*   **`prisma`**: The single source of truth for the Database Schema.
    *   *Database*: PostgreSQL.
    *   *Models*: `User`, `Folder`, `Job`, `Chat`, `Integration`.
*   **`shared`**: Utilities and types shared between apps.
*   **`ui`**: Shared UI component library (Design System).

### 3. Python Service (`python/`)

A specialized microservice for running AI models.
*   *Tech*: Python 3.10+, Websockets, PyTorch, Transformers.
*   *Capabilities*:
    *   **Transcription**: `faster-whisper`.
    *   **Face Recognition**: `face-recognition`, `dlib`.
    *   **Object Detection**: `ultralytics` (YOLO), `transformers`.
    *   **OCR**: `easyocr`.

## Data Flow: Video Indexing

1.  **Ingestion**: User adds a `Folder` path or uploads a video.
2.  **Detection**: `desktop` or `web` detects new file, creates a `Job` record (status: `pending`).
3.  **Queueing**: `Job` is added to BullMQ.
4.  **Processing**: `background-jobs` worker picks up the job.
5.  **AI Analysis**:
    *   Worker opens Websocket connection to `python` service.
    *   Sends video path.
    *   `python` service runs pipeline: Extract Audio -> Transcribe -> Detect Faces -> Detect Scenes.
6.  **Storage**: Metadata stored in PostgreSQL (`ChatMessage`, `Job`). Embeddings stored in ChromaDB (or similar vector store).
7.  **Completion**: Job marked as `done`.

## Key Patterns

*   **Local-First AI**: Heavy dependencies (`ffmpeg`, `torch`) are managed locally.
*   **Event-Driven**: BullMQ drives the processing pipeline; Status updates likely pushed via Websockets to UI (implied).
*   **Monorepo**: Shared code via pnpm workspaces.
