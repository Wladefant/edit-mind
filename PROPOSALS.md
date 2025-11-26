# Edit Mind: Evolution Proposals

This document outlines a detailed roadmap for evolving Edit Mind into a production-grade, collaborative video intelligence platform.

---

## 1. Feature Deep Dive: "Working Together" (Real-Time Collaboration)

**Goal:** Transform Edit Mind from a single-user tool into a collaborative workspace where teams can index, tag, and search video libraries together in real-time.

### 1.1 The "Google Docs for Video" Experience
- **Live Cursors:** See where other users are in the timeline.
- **Collaborative Tagging:** User A names a face "John"; User B sees the label update instantly.
- **Shared Search Sessions:** One user drives the search, results update for everyone.

### 1.2 Technical Solution: CRDTs & WebSockets
We will use **Yjs** (Conflict-free Replicated Data Types) to handle state synchronization. This ensures eventual consistency even with network latency.

#### Architecture
```mermaid
graph TD
    UserA[User A (Web)] -->|WebSocket| SyncServer[Sync Server (Node.js)]
    UserB[User B (Desktop)] -->|WebSocket| SyncServer
    SyncServer -->|Persist| Redis[(Redis / Postgres)]
    
    subgraph "Client State (Yjs)"
        Map[Y.Map: Metadata]
        Array[Y.Array: TimelineTags]
        Awareness[Y.Awareness: Cursors]
    end
```

#### Implementation Plan
1.  **Shared Package (`packages/collaboration`)**:
    *   Define Yjs document structure (schemas).
    *   Export typed hooks (e.g., `useCollaborativeScene(sceneId)`).
2.  **Backend (`apps/background-jobs`)**:
    *   Integrate `y-websocket` or `hocuspocus` (a scalable Yjs server).
    *   Bind Yjs updates to PostgreSQL for permanent storage.
3.  **Frontend Integration**:
    *   Replace local `useState` for tags/labels with Yjs hooks.
    *   Add "Presence" UI (avatars in top bar).

---

## 2. Architecture 2.0: The "Edit Mind Core"

**Goal:** Decouple business logic from the UI to support robust cross-platform development.

### 2.1 The "Core" Package (`packages/core`)
Move all non-UI logic here. This ensures `apps/web` and `apps/desktop` share the exact same "brain".

*   **Structure:**
    *   `src/services/`: API clients, Authentication.
    *   `src/store/`: Global state (Zustand stores).
    *   `src/models/`: Domain logic (e.g., `Video.getDuration()`, `Scene.formatTimestamp()`).

### 2.2 Type-Safe API Layer (tRPC)
Replace manual REST endpoints with **tRPC**.
*   **Why:** You get full TypeScript autocomplete on the frontend for backend functions. No more `interface User` duplication.
*   **How:**
    *   Backend: Define routers (`videoRouter`, `searchRouter`).
    *   Frontend: `trpc.video.get.useQuery({ id: 1 })`.

---

## 3. Plugin Marketplace Architecture

**Goal:** Allow the community to build and share analysis models (e.g., "Golf Swing Analyzer", "Car Make Detector").

### 3.1 Plugin Manifest (`plugin.json`)
Every plugin defines its capabilities:
```json
{
  "id": "com.example.golf-analyzer",
  "name": "Golf Swing Pro",
  "version": "1.0.0",
  "inputs": ["video_frame"],
  "outputs": ["pose_data", "swing_speed"],
  "config": {
    "confidence_threshold": { "type": "slider", "min": 0, "max": 1 }
  }
}
```

### 3.2 The "Sandbox"
Run Python plugins in isolated Docker containers or venvs to prevent crashing the main app.
*   **Manager:** A new `PluginManager` class in the Python service that dynamically loads/unloads modules based on user settings.

---

## 4. Modern Tooling & Libraries

### 4.1 Build System: Turborepo
**Current:** Standard pnpm workspaces.
**Proposed:** **Turborepo**.
*   **Benefit:** Caches build artifacts. If you only change `apps/web`, it won't rebuild `packages/ui`.
*   **Command:** `turbo run build test lint`

### 4.2 State Management: Zustand + Immer
**Current:** React Context?
**Proposed:** **Zustand**.
*   **Why:** Minimal boilerplate, works outside React components (great for the IPC layer in Electron).
*   **Pattern:**
    ```typescript
    const useStore = create((set) => ({
      videos: [],
      addVideo: (v) => set(produce(state => { state.videos.push(v) }))
    }))
    ```

### 4.3 UI Component System: shadcn/ui
**Current:** Ad-hoc Tailwind.
**Proposed:** **shadcn/ui** (Radix UI + Tailwind).
*   **Strategy:**
    1.  Initialize in `packages/ui`.
    2.  Export components: `<Button>`, `<Dialog>`, `<DataTable>`.
    3.  Theme: Use CSS variables for easy "Dark Mode" and "Brand Theming".

### 4.4 Testing: Vitest & Playwright
*   **Unit:** Switch Jest to **Vitest** (native Vite support, faster).
*   **E2E:** **Playwright** is perfect. Add visual regression testing to catch UI breaks.

---

## 5. Immediate "Quick Wins"

1.  **Strict Types:** Enable `strict: true` in all `tsconfig.json` files.
2.  **Pre-commit Hooks:** Install `husky` to run `tsc --noEmit` before every commit.
3.  **Absolute Imports:** Configure paths `@/components`, `@/lib` in all apps for cleaner imports.
