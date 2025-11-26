# Edit Mind - AI Coding Agent Instructions

## Project Overview

Edit Mind is a comprehensive, cross-platform application for AI-powered video indexing and semantic search. It provides both **Desktop (Electron)** and **Web** interfaces to search your videos by content (faces, speech, objects, events) rather than just filenames.

**Key Technology Stack:**
- **Monorepo:** pnpm workspaces
- **Containerization:** Docker, Docker Compose (recommended for development)
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui
- **Desktop App:** Electron (`apps/desktop`)
- **Web App:** React Router (`apps/web`)
- **Backend Services:** Node.js + Express + BullMQ (`apps/background-jobs`)
- **AI/ML Pipeline:** Python 3.9+ (OpenCV, PyTorch, Whisper, face recognition)
- **Vector Database:** ChromaDB (port 8000)
- **Relational DB:** PostgreSQL (via Prisma ORM)
- **Queue:** Redis + BullMQ
- **AI Models:** Google Gemini (NLP/search), local Whisper (transcription)

## Monorepo Architecture

### Applications (`apps/`)
- **`apps/desktop`**: Native Electron app with Conveyor IPC system
- **`apps/web`**: Full-stack React Router web application
- **`apps/background-jobs`**: Node.js service for video processing, AI analysis orchestration, and BullMQ job queues

### Shared Packages (`packages/`)
- **`packages/prisma`**: Database schema, migrations, seed data
- **`packages/shared`**: Cross-application constants, types, services, and utilities
- **`packages/ui`**: Reusable UI components (under construction)

### Python Services (`python/`)
- **`python/analysis_service.py`**: WebSocket-based video analysis service
- **`python/plugins/`**: Analysis plugins (face_recognition, object_detection, emotion_detection, etc.)

## Data Flow

### Video Indexing Pipeline (Web/Docker)
1. User adds folder → Background jobs service watches for videos
2. Videos queued in BullMQ → Worker processes each video:
   - Generate thumbnail (FFmpeg)
   - **Transcription:** Python service → Whisper model → `transcription.json`
   - **Frame Analysis:** Python plugins analyze scenes → `analysis.json`
   - **Scene Creation:** Merge transcription + analysis → `scenes.json`
   - **Embedding:** Generate embeddings → ChromaDB
3. Job progress tracked in PostgreSQL `Job` table

### Video Indexing Pipeline (Desktop/Electron)
1. User selects folder via Conveyor IPC → finds videos
2. For each video: same pipeline as above but orchestrated via Electron main process
3. Results cached in `.results/{videoName}/`

### Search Flow
1. User query → Gemini API converts to structured JSON query
2. ChromaDB vector search + metadata filtering → return `Scene[]`

## Desktop App: Conveyor IPC System

**DO NOT use `ipcMain.handle()` or `ipcRenderer.invoke()` directly.** Use the Conveyor system in `apps/desktop/lib/conveyor/`.

### How to Add a New IPC Channel

**1. Define Schema** (`apps/desktop/lib/conveyor/schemas/{name}-schema.ts`):
```typescript
export const myIpcSchema = {
  'my-channel-name': {
    args: z.tuple([z.string(), z.number()]),
    return: z.object({ result: z.string() }),
  },
}
```

**2. Register in Main Schemas** (`apps/desktop/lib/conveyor/schemas/index.ts`):
```typescript
export const ipcSchemas = {
  ...windowIpcSchema,
  ...appIpcSchema,
  ...myIpcSchema,
}
```

**3. Create API Class** (`apps/desktop/lib/conveyor/api/{name}-api.ts`):
```typescript
import { ConveyorApi } from '@/lib/preload/shared'

export class MyApi extends ConveyorApi {
  doSomething = (path: string, count: number) => 
    this.invoke('my-channel-name', path, count)
}
```

**4. Export in Conveyor** (`apps/desktop/lib/conveyor/api/index.ts`):
```typescript
export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  my: new MyApi(electronAPI),
}
```

**5. Create Handler** (`apps/desktop/lib/conveyor/handlers/{name}-handler.ts`):
```typescript
import { handle } from '@/lib/main/shared'

export const registerMyHandlers = () => {
  handle('my-channel-name', async (path: string, count: number) => {
    return { result: 'success' }
  })
}
```

**6. Register Handler** (`apps/desktop/lib/main/app.ts`):
```typescript
import { registerMyHandlers } from '@/lib/conveyor/handlers/my-handler'
registerMyHandlers()
```

## Python Plugin System

Plugins extend video analysis. Located in `python/plugins/`, inherit from `AnalyzerPlugin` (`python/plugins/base.py`).

**Available Plugins:**
- `face_recognition.py` - Face detection and recognition
- `object_detection.py` - YOLO-based object detection
- `emotion_detection.py` - Facial emotion analysis
- `activity.py` - Activity/action recognition
- `dominant_color.py` - Color palette extraction
- `environment.py` - Scene environment classification
- `shot_type.py` - Camera shot type detection
- `text_detection.py` - OCR/text extraction

### Creating a Plugin

```python
from plugins.base import AnalyzerPlugin
import logging

logger = logging.getLogger(__name__)

class MyPlugin(AnalyzerPlugin):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.results = []
        
    def setup(self) -> None:
        # Load ML models here (NOT in __init__)
        logger.info("MyPlugin ready")
    
    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict, video_path: str) -> Dict:
        frame_analysis['my_data'] = { 'detected': True }
        self.results.append({'timestamp': frame_analysis['start_time_ms']})
        return frame_analysis
    
    def get_results(self) -> Any:
        return self.results
    
    def get_summary(self) -> Any:
        return {'total': len(self.results)}
```

Register in `python/analyze.py`:
```python
plugin_module_map = {
    "MyPlugin": "my_plugin",
}
```

## Development Workflows

### Docker-First Setup (Recommended)

**Prerequisites:** Docker Desktop, pnpm

```bash
# 1. Clone and install
git clone https://github.com/iliashad/edit-mind
cd edit-mind
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set HOST_MEDIA_PATH, GEMINI_API_KEY, etc.

# 3. Start all services
docker compose -f docker/docker-compose.yml --env-file .env up --build
```

**Access Points:**
- **Web App:** http://localhost:3745
- **BullMQ Dashboard:** http://localhost:4000
- **ChromaDB:** http://localhost:8000/docs

### Desktop App Development

```bash
cd apps/desktop
pnpm run dev  # Starts Vite + Electron with hot reload
```

### Building Desktop App

```bash
cd apps/desktop
pnpm run build:win   # Windows
pnpm run build:mac   # macOS
pnpm run build:linux # Linux
```

## Environment Variables

Create `.env` in project root:

```ini
# Required
DATABASE_URL="postgresql://user:password@postgres:5432/app"
GEMINI_API_KEY="your_key_here"
HOST_MEDIA_PATH="/path/to/your/media/folder"

# Redis
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_URL="redis://redis:6379"

# ChromaDB
CHROMA_HOST="chroma"
CHROMA_PORT="8000"

# Python Service
PYTHON_PORT="8765"
VENV_PATH="/app/.venv"
PYTHON_SCRIPT="/app/python/analysis_service.py"

# File Paths (Docker)
UNKNOWN_FACES_DIR="/app/data/.unknown_faces"
PROCESSED_VIDEOS_DIR="/app/data/.analysis"
KNOWN_FACES_FILE="/app/data/.faces.json"
FACES_DIR="/app/data/.faces"
THUMBNAILS_PATH="/app/data/.thumbnails"
STITCHED_VIDEOS_DIR="/app/data/.stitched-videos"

# Models
SEARCH_AI_MODEL="/app/models/qwen2.5-1.5b-instruct-q4_k_m.gguf"
WHISPER_CACHE_DIR="/app/models"
YOLO_CONFIG_DIR="/app/models/yolo"

# Services
PORT="3745"
BACKGROUND_JOBS_PORT="4000"
BACKGROUND_JOBS_URL="http://background-jobs:4000"

# Security
SESSION_SECRET=""
ENCRYPTION_KEY=""
```

## Project Structure

```
edit-mind/
├── apps/
│   ├── desktop/           # Electron desktop app
│   │   ├── app/           # React renderer (components, hooks, pages)
│   │   ├── lib/           # Main process (conveyor/, main/, preload/, utils/)
│   │   └── resources/     # Build assets, icons
│   ├── web/               # React Router web app
│   │   ├── app/           # Routes, components, services
│   │   └── tests/         # Playwright tests
│   └── background-jobs/   # Node.js job processor
│       └── src/           # Workers, queues, API routes
├── packages/
│   ├── prisma/            # Database schema & migrations
│   ├── shared/            # Cross-app utilities
│   │   ├── constants/     # App-wide constants
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── services/      # gemini, vectorDb, pythonService, immich
│   │   ├── types/         # TypeScript types (Scene, Video, SearchQuery, etc.)
│   │   └── utils/         # ffmpeg, transcribe, scenes, embed, faces
│   └── ui/                # Shared UI components
├── python/                # AI/ML analysis service
│   ├── plugins/           # Analysis plugins
│   ├── analysis_service.py
│   ├── analyze.py
│   └── transcribe.py
└── docker/                # Docker configs
```

## Database Schema (Prisma)

Key models in `packages/prisma/schema.prisma`:
- **User**: Authentication, roles (admin/user)
- **Folder**: Watched folders, scan status
- **Job**: Video processing jobs (status, stage, progress)
- **Chat/ChatMessage**: Search conversation history
- **Integration**: External service configs (Immich)

## Shared Package (`packages/shared`)

### Services
- `gemini.ts` - Google Gemini API for NLP search parsing
- `vectorDb.ts` - ChromaDB operations
- `pythonService.ts` - WebSocket communication with Python
- `immich.ts` - Immich photo library integration
- `embedding.ts` - Text embedding generation

### Types
- `Scene` - Video segment with transcription, faces, objects, emotions
- `Video` - Video metadata (source, duration, aspect_ratio)
- `SearchQuery` - Structured search parameters
- `Analysis` - Raw Python analysis output

### Utilities
- `ffmpeg.ts` - Video processing helpers
- `transcribe.ts` - Whisper transcription
- `scenes.ts` - Scene generation from analysis
- `embed.ts` - Embedding generation
- `faces.ts` - Face management utilities

## Common Pitfalls

1. **Docker required:** Web app requires full Docker stack (PostgreSQL, Redis, ChromaDB)
2. **Desktop uses Conveyor:** Don't bypass IPC system in Electron app
3. **Shared package build:** Run `pnpm run build:shared` in desktop before dev
4. **HOST_MEDIA_PATH:** Must be set and shared with Docker for video access
5. **Python service:** WebSocket on port 8765, auto-managed by background-jobs
6. **Database migrations:** Run `pnpm prisma migrate dev` after schema changes

## Testing & Debugging

- **Web Tests:** `cd apps/web && pnpm test` (Playwright)
- **Desktop DevTools:** F12 or View → Toggle Developer Tools
- **BullMQ Dashboard:** http://localhost:4000 (job monitoring)
- **ChromaDB UI:** http://localhost:8000/docs
- **Python logs:** Check Docker logs for background-jobs container
- **Database:** Connect to PostgreSQL at `localhost:5433`

## Integrations

### Immich Support
Edit Mind can integrate with [Immich](https://immich.app/) photo/video library:
- Configure via `Integration` model (API key, base URL)
- Import videos from Immich library
- Sync metadata bidirectionally

## Current Limitations (v0.1.1)

- Shared UI package (`packages/ui`) under construction
- Desktop app doesn't use PostgreSQL (local file storage)
- No auto-packaging of Python in desktop builds
- Face recognition requires manual labeling
- Single-threaded Python analysis
