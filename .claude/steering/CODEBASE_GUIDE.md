# Developer Guide

## Setup

1.  **Prerequisites**:
    *   Node.js 20+
    *   pnpm (`npm i -g pnpm`)
    *   Python 3.10+ (for AI service)
    *   PostgreSQL & Redis (Docker Compose provided)
    *   Ffmpeg (via system or installed deps)

2.  **Installation**:
    ```bash
    pnpm install
    ```

3.  **Environment**:
    *   Copy `.env.example` to `.env`.
    *   Set `DATABASE_URL` (Postgres).
    *   Set `REDIS_URL`.

4.  **Database**:
    ```bash
    pnpm prisma db push
    ```

5.  **Running Development**:
    *   **Start Infrastructure**: `docker-compose up -d`
    *   **Start Python Service**:
        ```bash
        cd python
        pip install -r requirements.txt
        python analysis_service.py # or similar entry point
        ```
    *   **Start Apps**:
        ```bash
        pnpm dev # Starts all apps concurrently? Check root package.json
        # OR
        pnpm --filter web dev
        pnpm --filter background-jobs dev
        pnpm --filter desktop dev
        ```

## Workflows

*   **Adding a dependency**: `pnpm add <package> --filter <app>`
*   **Database Migration**:
    1.  Edit `packages/prisma/schema.prisma`
    2.  `pnpm prisma migrate dev`
*   **New UI Component**: Add to `packages/ui` first if reusable.

## Project Structure

*   `apps/` - Deployable applications.
*   `packages/` - Shared libraries.
*   `python/` - AI Microservice.
