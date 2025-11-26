# Codebase Improvement Proposals

This document outlines suggested improvements for the Edit Mind project, covering architecture, libraries, code quality, and new features.

## 1. Architecture & Structure

### 1.1 Shared UI Component Library (`packages/ui`)
**Current Status:** Minimal implementation.
**Proposal:**
- Implement a robust component library using **shadcn/ui** within `packages/ui`.
- Export components (Button, Input, Dialog, etc.) to be consumed by both `apps/web` and `apps/desktop`.
- **Benefit:** Ensures visual consistency across platforms and reduces code duplication.

### 1.2 Type-Safe API Client
**Current Status:** Likely using `fetch` or `axios` directly.
**Proposal:**
- Create a shared API client package or utility in `packages/shared`.
- Use **tRPC** (if backend can be adapted) or generate a client using **OpenAPI/Swagger** from the Express backend.
- **Benefit:** End-to-end type safety, preventing API integration bugs.

### 1.3 Monorepo Tooling
**Current Status:** pnpm workspaces.
**Proposal:**
- Integrate **Turborepo** for high-performance build system.
- Configure pipeline to cache builds and test results.
- **Benefit:** Faster CI/CD and local development, especially as the project grows.

## 2. Libraries & Technologies

### 2.1 State Management
**Proposal:**
- Standardize on **Zustand** or **Jotai** for global client-side state management.
- **Why:** Simpler and less boilerplate than Redux; more flexible than Context API for complex state.

### 2.2 Data Fetching
**Proposal:**
- Adopt **TanStack Query (React Query)** for all server state management in `apps/web` and `apps/desktop`.
- **Why:** Handles caching, deduplication, loading states, and error handling out of the box.

### 2.3 Python Performance
**Proposal:**
- Use **uv** or **Poetry** for Python dependency management (instead of just `requirements.txt`).
- Explore **Celery** as an alternative to the custom Python service orchestration if complexity increases.

## 3. Code Quality & Testing

### 3.1 Centralized Configuration
**Proposal:**
- Create a `@edit-mind/eslint-config` and `@edit-mind/tsconfig` package.
- **Benefit:** Enforces consistent linting and coding standards across all apps and packages.

### 3.2 Testing Strategy
**Proposal:**
- **Background Jobs:** Add **Jest** or **Vitest** for unit testing worker logic.
- **Python:** Add **pytest** for testing analysis plugins and core logic.
- **E2E:** Expand Playwright tests to cover critical user flows (indexing, searching).

## 4. New Features

### 4.1 Plugin Marketplace / Manager
**Proposal:**
- Create a UI in the Settings area to enable/disable specific Python analysis plugins.
- Allow users to configure plugin parameters (e.g., confidence thresholds for face detection).

### 4.2 Real-time Collaboration (Web)
**Proposal:**
- If the web app is hosted, allow multiple users to tag/annotate videos simultaneously.
- Use **Socket.io** (already using `ws`) to sync state.

### 4.3 Smart Highlights / Auto-Editor
**Proposal:**
- Use the semantic search capabilities to automatically generate a "highlight reel" based on a text prompt (e.g., "Show me all funny moments with John").
- Export the timeline as an `.edl` or `.xml` file for import into Premiere Pro/DaVinci Resolve.

## 5. Development Workflow

### 5.1 Docker Dev Environment
**Proposal:**
- Create a `devcontainer.json` for VS Code to standardize the development environment.
- Ensure all developers have the exact same Python and Node.js versions.

### 5.2 Pre-commit Hooks
**Proposal:**
- Use **Husky** and **lint-staged** to run linters and type checks before committing.
