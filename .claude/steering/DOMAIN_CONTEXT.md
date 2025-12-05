# Domain Context

## Core Domain: Video Intelligence

The system transforms raw video files into searchable, structured knowledge.

### Entities

1.  **Job (`Job`)**:
    *   **Concept**: A unit of work representing the processing of a single video file.
    *   **Lifecycle**: Pending -> Processing -> [Stages: Transcribing -> Analysis -> Embedding] -> Done/Error.
    *   **Invariants**: A job must belong to a user. A job tracks progress (0-100%).

2.  **Folder (`Folder`)**:
    *   **Concept**: A local directory watched for video files.
    *   **Behavior**: When a file is added to a watched folder, a Job is triggered.

3.  **Chat (`Chat` & `ChatMessage`)**:
    *   **Concept**: User interaction with the video knowledge base.
    *   **Feature**: "Talk to your video".
    *   **Logic**: User query -> Embedding -> Vector Search (Chroma) -> Context Retrieval -> LLM Response.

4.  **Integration (`Integration`)**:
    *   **Concept**: External connection (currently Immich).
    *   **Purpose**: Sync videos/photos from Immich API instead of local filesystem.

### Business Rules

*   **Video Processing**:
    *   Must be idempotent (re-processing same file shouldn't duplicate data, checked via hash or path).
    *   Must handle failures gracefully (files can be corrupt).
*   **Privacy**:
    *   All processing is local.
    *   Embeddings and data stay in local Postgres/Chroma.
*   **Access Control**:
    *   `User` role `admin` vs `user`.
    *   Users can only see their own Folders/Jobs/Chats.

### Terminology

*   **Embedding**: Vector representation of text or video frames.
*   **Transcription**: Speech-to-text (Whisper).
*   **Scene**: A distinct segment of video detected by visual changes.
*   **Face**: Detected human face mapped to a cluster/person.
