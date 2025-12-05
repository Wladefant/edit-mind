# AI Context & Bootstrap

> **Meta-Context for AI Agents**: Read this first to understand how to act within this codebase.

## 1. Project Identity

*   **Name**: `edit-mind`
*   **Type**: AI Video Indexing & Search Platform (Monorepo)
*   **Key Tech**: TypeScript, React 19, Node.js, Python, PostgreSQL, Prisma, Electron.

## 2. Core Directives

*   **Edit Source, Not Build**: Do not edit `out/`, `dist/`, or `.react-router/`.
*   **Schema First**: Changes to data model must start in `packages/prisma/schema.prisma`. Run `pnpm prisma generate` after changes.
*   **Monorepo Aware**:
    *   Install deps in root with `pnpm add -w`.
    *   Install app deps with `pnpm --filter <app_name> add <pkg>`.
    *   Run commands via `pnpm --filter <scope> <cmd>`.

## 3. "Don'ts" - Anti-Patterns to Avoid

*   ❌ **Don't hardcode paths**: Use configuration or relative paths compatible with both Dev and Electron environments.
*   ❌ **Don't put business logic in UI**: Logic belongs in `background-jobs` or `python` service if it's heavy, or strict React hooks if it's UI state.
*   ❌ **Don't ignore Types**: Strict TypeScript is enforced.
*   ❌ **Don't block the Event Loop**: Video processing is heavy. Offload to `background-jobs` queue always.

## 4. Testing Strategy

*   **E2E**: Playwright is set up in `apps/web`.
*   **Unit**: Vitest in `apps/desktop`.
*   **Python**: `pytest` for the AI service.

## 5. Coding Conventions

*   **Styling**: Tailwind CSS v4. Use utility classes.
*   **Components**: Radix UI primitives (`@radix-ui/*`) styled with Tailwind.
*   **State**: React Hooks.
*   **Async**: Use `async/await`. Handle errors in `try/catch`.
