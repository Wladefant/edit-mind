### 🧠 Edit Mind:  AI-Powered Video Indexing & Search

Edit Mind lets you **search your videos by content, not just filenames**. Recognize faces, transcribe speech, detect objects, and explore your library with natural language search. All **locally and securely**.  

Perfect for creators, editors, and researchers who need smarter video management.


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![ChromaDB](https://img.shields.io/badge/VectorDB-ChromaDB-purple.svg)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Containerized-Docker-blue.svg)](https://www.docker.com/)

> ⚠️ **Development Status:** Edit Mind is currently in **active development** and **not yet production-ready**.
> Expect incomplete features and occasional bugs. We welcome contributors to help us reach **v1.0**!

### 🧠 Your Video Library, Reimagined

**Edit Mind** is a comprehensive, cross-platform application (with both Desktop and Web interfaces) designed for intelligent video analysis, management, and search. It leverages a sophisticated backend system to process video files, extracting a rich set of metadata through AI-powered analysis. This allows users to perform deep searches on their video library, not just by filename, but by the actual content within the videos, such as recognized faces, spoken words, detected objects, and events.

All video files, frames, and extracted metadata remain fully **local**. The project emphasizes a **Docker-first development and deployment strategy**, ensuring a consistent environment across various platforms.

---

## 📺 Demo

### YouTube Walkthrough
[![Edit Mind Demo](https://img.youtube.com/vi/Ky9v85Mk6aY/maxresdefault.jpg)](https://www.youtube.com/watch?v=Ky9v85Mk6aY)  
*Click to watch a walkthrough of Edit Mind's core features.*

### GIF Demo
![Edit Mind Demo GIF](./demo.gif)  
*Quick demonstration of the video prompting feature*

---

## ⚡ Why Edit Mind?
- Search videos by spoken words, objects, faces, and events.
- Runs fully **locally**, respecting privacy.
- Works on **desktop and web**.
- Uses AI for rich metadata extraction and semantic search.


## ✨ Core Features

*   **Video Indexing and Processing:** A background service watches for new video files and queues them for AI-powered analysis.
*   **AI-Powered Video Analysis:** Extracts metadata like face recognition, transcription, object & text detection, scene analysis, and more.
*   **Vector-Based Semantic Search:** Powerful natural language search capabilities on video content using ChromaDB and Google Gemini.
*   **Dual Interfaces:** Access your video library through a native **Desktop App** (Electron) or a **Web App** (Docker).

---

## ⚙️ Monorepo Architecture & Tech Stack

This project is structured as a `pnpm` monorepo, separating concerns into distinct applications and shared packages.

### Applications

*   **`apps/desktop`**: The native Electron application, providing a rich user experience.
*   **`apps/web`**: A full-stack web application for browser-based access.
*   **`apps/background-jobs`**: The core backend service managing video processing, AI analysis orchestration, and job queues. (Used for the Docker setup)

### Shared Packages

*   **`packages/prisma`**: Database schema and migration management.
*   **`packages/shared`**: (Under refactoring) Contains utilities, types, and services shared across applications.
*   **`packages/ui`**: A shared UI component library (Under construction to share components between web and the desktop application).

### AI/ML Services

*   **`python/`**: Contains Python scripts for various AI-powered video analysis plugins, transcription, face matching and face reindexing. It's communicating via WebSockets.

### Core Technologies

| Area | Technology |
| :---------------- | :------------------------------------------------ |
| **Monorepo**      | [pnpm workspaces](https://pnpm.io/workspaces)   |
| **Containerization** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) |
| **Frontend**      | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **UI / Styling**  | [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend (Node.js)** | [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [BullMQ](https://bullmq.io/) |
| **AI / ML**       | [Python](https://www.python.org/), [OpenCV](https://opencv.org/), [PyTorch](https://pytorch.org/), OpenAI Whisper, Google Gemini (Used for NLP) |
| **Vector Database** | [ChromaDB](https://www.trychroma.com/)           |
| **Relational DB** | [PostgreSQL](https://www.postgresql.org/) (via [Prisma ORM](https://www.prisma.io/)) |

---

## 🚀 Getting Started (Docker-first Setup)

The recommended way to get started with Edit Mind is using Docker Compose, which will set up all necessary services (Node.js backend, Python analysis, PostgreSQL, ChromaDB).

### Prerequisites

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
*   [pnpm](https://pnpm.io/installation) installed.

### 1. Clone the repository

```bash
git clone https://github.com/iliashad/edit-mind
cd edit-mind
```

### 2. Install Node.js Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root (`edit-mind/.env`).
You can start by copying the example:

```bash
cp .env.example .env
```

**Important:** Set your `HOST_MEDIA_PATH` in the `.env` file for accessing your media folder from the docker setup and make sure over Docker settings to make this folder shareable over Docker.

```ini
# .env example
DATABASE_URL="postgresql://user:password@localhost:5432/editmind?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
PYTHON_PORT=5001 

HOST_MEDIA_PATH="/path/to/media/folder/in/your/server"

```

### 4. Start the Services with Docker Compose

This command will build Docker images for all services and start them in detached mode.

```bash
docker compose -f docker/docker-compose.yml --env-file .env up --build
```


### 5. Access the Applications

*   **Web App:** Open your browser to `http://localhost:3745` (or the port configured for the web service).
*   **Desktop App:** The Electron desktop application can be built and run separately. Refer to `apps/desktop/README.md` for specific instructions.
*   **BullMQ Dashboard:** (Development only) Access the job queue monitoring dashboard at `http://localhost:4000` (or the port configured for `background-jobs`).

---

## 📂 Project Structure

```
.
├── apps/                 # Individual applications (desktop, web, background-jobs)
│   ├── background-jobs/  # Node.js service for AI analysis orchestration & job queue
│   ├── desktop/          # Electron desktop application
│   └── web/              # Full-stack web application
├── packages/             # Shared libraries and packages
│   ├── prisma/           # Prisma schema, migrations, and database utilities
│   ├── shared/           # Cross-application constants, types, and utilities
│   └── ui/               # Reusable UI components
├── python/               # Core Python AI/ML analysis services and plugins
├── docker/               # Dockerfiles and docker-compose configurations
└── ...                   # Other configuration files (pnpm-workspace.yaml, .env.example, etc.)
```

For detailed instructions on each application, refer to their respective `README.md` files:
*   [**`apps/desktop/README.md`**](apps/desktop/README.md)
*   [**`apps/web/README.md`**](apps/web/README.md)
*   [**`apps/background-jobs/README.md`**](apps/background-jobs/README.md)

---

## 🤝 Contributing

We welcome contributions of all kinds! Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.