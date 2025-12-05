# Testing Guide

## Strategy

The project employs a multi-layered testing strategy due to its hybrid nature (JS/Python/Electron).

### 1. End-to-End (E2E) - `apps/web`

*   **Tool**: Playwright.
*   **Location**: `apps/web/tests/` (implied standard).
*   **Scope**: Critical user flows (Login, Upload, Search).
*   **Running**: `pnpm --filter web test`.

### 2. Integration/Unit - `apps/desktop`

*   **Tool**: Vitest.
*   **Location**: `apps/desktop/src/**/__tests__` or `*.test.tsx`.
*   **Scope**: React components, Electron IPC handlers.
*   **Running**: `pnpm --filter desktop test`.

### 3. Python Service Tests

*   **Tool**: Pytest.
*   **Location**: `python/tests/`.
*   **Scope**:
    *   AI model output validation (mocked inputs).
    *   Websocket protocol handling.
    *   File processing logic.
*   **Running**: `pytest` inside `python/` directory.

## Best Practices

*   **Mock Heavy AI**: Don't run real Whisper/YOLO models in CI unit tests. Mock the return values.
*   **Test Database**: Use a separate test DB or Docker container for integration tests requiring Prisma.
*   **Electron mocking**: Mock `electron` imports when testing React components in isolation.

## Gaps Identified

*   No explicit testing setup seen for `background-jobs` (Node.js worker). Recommend adding `vitest` there for job logic.
*   E2E for Electron is complex; reliance on Web E2E is a good proxy but misses native integration bugs.
