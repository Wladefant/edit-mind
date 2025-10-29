# Edit Mind - AI Coding Agent Instructions

## Project Overview

Edit Mind is a cross-platform Electron desktop app for AI-powered video indexing and semantic search. It's an "editor's second brain" that locally indexes video libraries using Python-based ML analysis (transcription, face recognition, object detection, OCR) and stores embeddings in ChromaDB for semantic search.

**Key Technology Stack:**
- **Frontend:** Electron + React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui
- **Backend (Main Process):** Node.js + Electron main process
- **AI/ML Pipeline:** Python 3.9+ (OpenCV, PyTorch, Whisper, face recognition)
- **Vector Database:** ChromaDB (external service on port 8000)
- **AI Models:** Google Gemini 2.5 Pro (search query parsing), Google Text Embedding 004 (embeddings)

## Architecture & Data Flow

### Three-Process Architecture
1. **Renderer Process** (`app/`): React UI, communicates via Conveyor IPC
2. **Main Process** (`lib/main/`): Electron backend, orchestrates services
3. **Python Service** (`python/`): WebSocket-based analysis service (`analysis_service.py`)

### Critical Data Flow
**Video Indexing Pipeline:**
1. User selects folder → `selectFolder` handler finds videos → filters already-indexed via ChromaDB
2. For each new video:
   - Generate thumbnail (FFmpeg) → `.thumbnails/`
   - **Transcription:** Python service extracts audio → Whisper model → `{videoName}/transcription.json`
   - **Frame Analysis:** Python plugins analyze 2-second scenes → `{videoName}/analysis.json`
   - **Scene Creation:** Merge transcription + analysis → `{videoName}/scenes.json`
   - **Embedding:** Generate text from scenes → Google Embedding API → ChromaDB
3. Results cached in `.results/{videoName}/` to avoid re-processing

**Search Flow:**
1. User query → `searchDocuments` handler
2. Gemini API converts natural language to structured JSON query (faces, objects, emotions, shot_type, etc.)
3. ChromaDB vector search + metadata filtering → return matching `Scene[]`

## Custom IPC System: "Conveyor"

**DO NOT use `ipcMain.handle()` or `ipcRenderer.invoke()` directly.** Use the Conveyor system located in `lib/conveyor/`.

### How to Add a New IPC Channel

**1. Define Schema** (`lib/conveyor/schemas/{name}-schema.ts`):
```typescript
export const myIpcSchema = {
  'my-channel-name': {
    args: z.tuple([z.string(), z.number()]), // Request args
    return: z.object({ result: z.string() }), // Response type
  },
}
```

**2. Register in Main Schemas** (`lib/conveyor/schemas/index.ts`):
```typescript
export const ipcSchemas = {
  ...windowIpcSchema,
  ...appIpcSchema,
  ...myIpcSchema, // Add here
}
```

**3. Create API Class** (`lib/conveyor/api/{name}-api.ts`):
```typescript
import { ConveyorApi } from '@/lib/preload/shared'

export class MyApi extends ConveyorApi {
  doSomething = (path: string, count: number) => 
    this.invoke('my-channel-name', path, count)
}
```

**4. Export in Conveyor** (`lib/conveyor/api/index.ts`):
```typescript
export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  my: new MyApi(electronAPI), // Add here
}
```

**5. Create Handler** (`lib/conveyor/handlers/{name}-handler.ts`):
```typescript
import { handle } from '@/lib/main/shared'

export const registerMyHandlers = () => {
  handle('my-channel-name', async (path: string, count: number) => {
    // Implementation - args are auto-validated by Zod
    return { result: 'success' }
  })
}
```

**6. Register Handler** (`lib/main/app.ts`):
```typescript
import { registerMyHandlers } from '@/lib/conveyor/handlers/my-handler'
registerMyHandlers()
```

**Usage in React:**
```typescript
import { useConveyor } from '@/app/hooks/use-conveyor'

const myApi = useConveyor('my')
const result = await myApi.doSomething('/path', 42)
```

## Python Plugin System

### Creating an Analysis Plugin

Plugins extend video analysis capabilities. All plugins inherit from `AnalyzerPlugin` (`python/plugins/base.py`).

**1. Create Plugin File** (`python/plugins/my_plugin.py`):
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
        # Process frame (called for EVERY 2-second scene)
        frame_analysis['my_data'] = { 'detected': True }
        self.results.append({'timestamp': frame_analysis['start_time_ms']})
        return frame_analysis
    
    def get_results(self) -> Any:
        return self.results
    
    def get_summary(self) -> Any:
        logger.info(f"Total detections: {len(self.results)}")
        return {'total': len(self.results)}
```

**2. Register Plugin** (`python/analyze.py`):
```python
plugin_module_map = {
    "MyPlugin": "my_plugin",  # Add here (no .py extension)
}
```

**Performance Rules:**
- Load models in `setup()`, NOT `analyze_frame()`
- Don't store entire frames - extract data only
- Use NumPy vectorized operations
- Clean up large tensors with `del` immediately

## Development Workflows

### Running in Dev Mode
```bash
npm run dev  # Starts Vite dev server + Electron with hot reload
```

### Python Service Setup (Required)
```bash
cd python
python3.12 -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
chroma run --host localhost --port 8000 --path .chroma_db
```

### Building for Production
```bash
npm run build:win   # Windows installer
npm run build:mac   # macOS .dmg
npm run build:linux # Linux AppImage
```

### Environment Variables (.env)
```
GEMINI_API_KEY=your_api_key_here  # Required for search & embeddings
CHROMA_HOST=localhost             # Optional, defaults to localhost
CHROMA_PORT=8000                  # Optional, defaults to 8000
```

## Project Conventions

### File Organization
- `app/`: Renderer process (React components, hooks, pages, styles)
- `lib/main/`: Main process logic
- `lib/conveyor/`: Type-safe IPC system (api/, handlers/, schemas/)
- `lib/services/`: Node.js services (pythonService, vectorDb, gemini)
- `lib/utils/`: Utility functions (ffmpeg, transcribe, scenes, embed)
- `lib/types/`: TypeScript type definitions
- `python/`: Python analysis service & plugins

### Path Aliases
Use `@/app` and `@/lib` imports (configured in `electron.vite.config.ts`):
```typescript
import { useConveyor } from '@/app/hooks/use-conveyor'
import { pythonService } from '@/lib/services/pythonService'
```

### React Component Patterns
- Use **functional components** with hooks
- **shadcn/ui** components in `app/components/ui/`
- Custom hooks in `app/hooks/` (prefix with `use`)
- Pages in `app/pages/` (Index, Chat, Videos, Settings, Training)
- HashRouter navigation (Electron requires `HashRouter`)

### Python Service Communication
The Python service runs as a subprocess with WebSocket IPC:
- **Windows:** TCP socket (`ws://127.0.0.1:{port}`)
- **Unix/macOS:** Unix socket (`ws+unix://{path}`)
- Service auto-restarts on crash (max 10 times with backoff)
- Check `pythonService.isServiceRunning()` before calling

### Data Persistence
- **ChromaDB:** Scene embeddings and metadata (external service)
- **File System:**
  - `.results/{videoName}/`: Cached analysis results (transcription.json, analysis.json, scenes.json)
  - `.thumbnails/`: Video thumbnails
  - `.faces/{personName}/`: Known face encodings
  - `.faces.json`: Face name → image paths mapping
  - `settings.json`: User settings (in project root)

### TypeScript Types
Key types in `lib/types/`:
- `Scene`: A 2-second video segment with transcription, faces, objects, emotions, colors
- `Video`: Video metadata (source, duration, aspect_ratio, camera, category)
- `VideoWithScenes`: Video + array of Scene objects
- `SearchQuery`: Structured search parameters (faces, objects, shot_type, etc.)
- `Analysis`: Raw Python analysis output
- `AnalysisProgress`: Progress events from Python service

## Common Pitfalls

1. **Don't bypass Conveyor:** Always use the schema → api → handler pattern for IPC
2. **Python service dependencies:** Call `pythonService.start()` in main process before using (already done in `main.ts`)
3. **ChromaDB required:** App won't work without ChromaDB running on port 8000
4. **Scene timing:** Scenes are 2-second chunks (configurable via `sample_interval_seconds` in `settings.json`)
5. **Face recognition:** Unknown faces stored in `analysis_results/unknown_faces/` must be manually labeled
6. **Transcription files:** Missing transcription.json will trigger re-transcription on next index

## Testing & Debugging

- **Electron DevTools:** Press F12 in app or use `View → Toggle Developer Tools`
- **Python logs:** Stderr output appears in terminal running `npm run dev`
- **Service logs:** Check WebSocket messages in `pythonService.ts`
- **ChromaDB UI:** Visit `http://localhost:8000/docs` for FastAPI interface

## External Dependencies Requiring Manual Setup

1. **ChromaDB Server:** Must be running before app starts
   ```bash
   chroma run --host localhost --port 8000 --path .chroma_db
   ```
2. **FFmpeg/FFprobe:** Bundled via `ffmpeg-ffprobe-static` (auto-installed)
3. **Python 3.9+:** Required for analysis service
4. **Gemini API Key:** Required in `.env` for search functionality

## Current Limitations (v0.1.0)

- No offline embedding/query models yet (requires Google API)
- No auto-packaging of Python environment in builds
- Face recognition requires manual labeling of unknown faces
- Re-indexing entire library on schema changes (no migrations)
- Single-threaded Python analysis (no parallel processing)
