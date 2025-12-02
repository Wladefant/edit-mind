# 💻 Edit Mind Desktop App — AI-Powered Video Indexing & Semantic Search

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE.md)
[![Made with Electron](https://img.shields.io/badge/Built%20with-Electron-blue.svg)](https://www.electronjs.org/)

> ⚠️ **Development Status:** Edit Mind Desktop App is part of a larger monorepo and is currently in **active development**.
> Expect incomplete features and occasional bugs.

### 🧠 Your Video Library, Reimagined

**Edit Mind Desktop App** is a native application that acts as an **editor’s second brain**.

<img width="1197" height="1000" alt="Screenshot 2025-10-26 at 21 51 30" src="https://github.com/user-attachments/assets/25a6710c-e414-45f0-a258-21bdbd1dd352" />

It locally indexes your entire video library, generating deep metadata using **AI analysis** — including:

- 🎙 Full transcriptions
- 👤 Recognized faces
- 🎨 Dominant colors
- 📦 Detected objects
- 🔤 On-screen text (OCR)

This creates a **fully searchable, offline-first video database**, letting you find the exact shot you need in seconds.

---

## 📺 See It In Action

[![Edit Mind Demo](https://img.youtube.com/vi/Ky9v85Mk6aY/maxresdefault.jpg)](https://www.youtube.com/watch?v=Ky9v85Mk6aY)

*Click to watch a walkthrough of Edit Mind's core features*

---

## ⚙️ How It Works (Desktop Specifics)

When you add a video, the Desktop App works with the backend services to run a complete **AI-powered local analysis pipeline**:

1.  **🎙 Full Transcription** — Extracts and transcribes the audio track using a local [OpenAI Whisper](https://github.com/openai/whisper) model for time-stamped dialogue.
2.  **🎞 Scene Segmentation** — Splits the video into 2-second “Scenes” for precise frame-level indexing.
3.  **🧩 Deep Frame Analysis** — Each Scene is analyzed by Python plugins to:
    *   Recognize faces
    *   Detect objects
    *   Perform OCR (on-screen text)
    *   Analyze colors and composition
4.  **🧠 Data Consolidation** — Aligns spoken text with visual content using timestamps.
5.  **🔍 Vector Embedding & Storage** — All extracted data (transcripts, tags, and metadata) are embedded using **Google Text Embedding Models** and stored locally in **[ChromaDB](https://www.trychroma.com/)**.
6.  **🗣 Semantic Search Parsing** — When you search in natural language (e.g. _“show me all clips where Ilias looks happy”_), Edit Mind uses **Google Gemini 2.5 Pro** to convert your search prompt into a structured JSON query.
    This query is then executed locally against the ChromaDB vector store to retrieve relevant scenes.

---

> 💡 **Privacy by Design:**
> All video files, frames, and extracted metadata remain fully **local**.
> The only cloud-based component is the **Gemini API call for search prompt interpretation** and **Google text embedding generation** — no raw video are ever uploaded.
> In a future update, Edit Mind will include the option to use **offline embedding and query models** for completely disconnected operation.

---

## ✨ Features

| Category | Description |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| 🔒 **Privacy-First** | 100% local AI processing. Your videos never leave your device.                                                                        |
| 🧠 **Deep Indexing** | Extracts transcription, faces, objects, text, and colors automatically.                                                               |
| 🔍 **Semantic Search** | Search your videos by meaning, not just filenames — e.g. “scenes with two people talking at a table.”                                  |
| 🎬 **AI-Generated Rough Cuts** | Describe your desired sequence in natural language: <br>\`“Give me all clips where @ilias looks happy.”\` <br> Edit Mind finds matching scenes and assembles a rough cut. |
| 💻 **Cross-Platform** | Runs on macOS, Windows, and Linux (Electron).                                                                                         |
| 🧩 **Plugin-Based Architecture** | Easily extend analysis capabilities with Python plugins (e.g. logo detection, emotion analysis).                              |
| 🪄 **Modern UI** | Built with React, TypeScript, and [shadcn/ui](https://ui.shadcn.com/) for a clean, responsive experience.                           |

---

## 🧭 Roadmap

### **v0.2.0**
- [ ] Advanced search filters (date range, camera type)
- [ ] Export rough cuts as an Adobe Premiere Pro and Final Cut Pro project
- [ ] Improved indexing performance

### **v0.3.0**
- [ ] New analysis plugins (e.g., audio event detection)
- [ ] Plugin documentation and examples

### **Future**
- [ ] Optional cloud sync for indexes
- [ ] Collaborative tagging and shared libraries
- [ ] Plugin marketplace

---

## 🛠️ Tech Stack (Desktop Specific)

| Area | Technology |
| :---------------- | :------------------------------------------------ | 
| **App Framework** | [Electron](https://www.electronjs.org/)           |
| **Frontend**      | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **UI / Styling**  | [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend (Node.js)** | [Node.js](https://nodejs.org/) (for main process logic) |
| **AI / ML**       | Python backend services (orchestrated by Node.js) |
| **Vector Database** | [ChromaDB](https://www.trychroma.com/)           |
| **Packaging**     | [Electron Builder](https://www.electron.build/)   |
| **Linting / Formatting** | [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) |

---

## 🚀 Getting Started with the Desktop App (Development)

This section outlines how to run and build the Electron Desktop application in development mode, assuming the core backend services (PostgreSQL, ChromaDB, Python analysis service, Node.js background jobs) are already running via Docker Compose (as described in the **root `README.md`**).

### Prerequisites

*   Ensure you have followed the main setup instructions in the **[root `README.md`](../../README.md)**, and all Docker services are running.
*   Node.js (v22+) and pnpm are installed.

### 1. Navigate to the Desktop App Directory

```bash
cd apps/desktop
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run in Development Mode

```bash
pnpm run dev
```

This will start the Electron application with hot-reloading for development.

### 4. Build for Production

To create a distributable package for your operating system, use the build command (from the `apps/desktop` directory):

```bash
pnpm run build:mac # For macOS
# pnpm run build:win # For Windows
# pnpm run build:linux # For Linux
```

This will generate an installer or executable in the `out/` directory within `apps/desktop`, configured according to `electron-builder.yml`.

---

## 📊 Performance Benchmarks (Desktop App Context)

To help you understand Edit Mind's resource requirements, here are real-world performance metrics from analyzing large video files within the Desktop App environment.

### Test Environment

-   **Hardware:** M1 MacBook Max with 64 GB RAM
-   **Enabled Plugins:**
    -   ObjectDetectionPlugin
    -   FaceRecognitionPlugin
    -   ShotTypePlugin
    -   EnvironmentPlugin
    -   DominantColorPlugin

> **Note:** The metrics below reflect frame analysis time and peak memory usage. Transcription and embedding score processing stages are not included in these measurements.

*(Lower is better - 1.0× means processing takes the same time as video duration)*

| File Size (MB) | Video Codec | Frame Analysis Time (s) | Video Duration (s) | Processing Rate | Peak Memory (MB) |
| :----------- | :---------- | :---------------------- | :----------------- | :-------------- | :--------------- |
| 20150.38 | h264 | 7707.29 | 3372.75 | 2.29× | 4995.45 |
| 11012.64 | hevc | 3719.77 | 1537.54 | 2.42× | 10356.77 |
| 11012.24 | hevc | 3326.29 | 1537.54 | 2.16× | 11363.27 |
| 11001.07 | hevc | 1576.47 | 768.77 | 2.05× | 10711.09 |
| 11000.95 | hevc | 1592.94 | 768.77 | 2.07× | 11250.42 |
| 11000.55 | hevc | 1598.97 | 768.77 | 2.08× | 10797.03 |
| 11000.15 | hevc | 2712.68 | 768.77 | 3.53× | 5127.25 |
| 10999.96 | hevc | 1592.72 | 768.77 | 2.07× | 11328.47 |
| 10755.45 | hevc | 3762.24 | 751.65 | 5.01× | 5196.98 |

### Key Takeaways

-   **Processing Speed:** Approximately **2-3 hours** of analysis time per hour of video content with all plugins enabled
-   **Memory Usage:** Peak memory consumption ranges from **5-11 GB** depending on video complexity and codec
-   **Codec Impact:** HEVC videos show varied performance, likely due to differences in encoding parameters and scene complexity

> 💡 **Performance Tips:**
> -   Disable unused plugins to reduce processing time and memory usage
> -   Consider processing large files during off-hours
> -   Ensure sufficient RAM (16GB+ recommended for optimal performance)
> -   SSD storage significantly improves I/O performance during analysis

---

## 🧑‍💻 How to Contribute

We welcome contributions of all kinds to the Edit Mind project! This desktop application is a key part of the user experience. Here are a few ways you can help:

-   **Reporting Bugs:** If you find a bug, please open an issue in the main repository.
-   **Improving the UI:** Have ideas to make the interface better? We'd love to hear them.
-   **Enhancing Desktop-specific Features:** Contribute to Electron-specific optimizations or integrations.

Please read the main `CONTRIBUTING.md` in the project root for details on our code of conduct and the process for submitting pull requests.

## 🙏 Acknowledgements

This project was bootstrapped from the excellent [guasam/electron-react-app](https://github.com/guasam/electron-react-app) template. It provided a solid foundation with a modern Electron, React, and Vite setup, which allowed us to focus on building the core features of Edit Mind.

## ⚠️ Known Challenges & Areas for Contribution (Desktop Specific)

While the core architecture is robust, the project is still in early development. Contributions are welcome in solving these key challenges to make the app production-ready.

1.  **Application Packaging & Distribution:**
    The current setup is developer-focused. A major goal is to create a seamless, one-click installer for non-technical users. This involves bundling the Python environment, ML models, and all dependencies into the final Electron application for macOS, Windows, and Linux. Contributions in this area (e.g., using PyInstaller, managing model downloads) are highly welcome.

2.  **Performance on Consumer Hardware:**
    The analysis pipeline is resource-intensive. While the code includes memory monitoring and optimizations, further work is needed to ensure smooth operation on a variety of consumer-grade machines. Key areas for improvement include:
    *   Implementing a robust background queuing system for video processing.
    *   Adding user-configurable "analysis levels" (e.g., "transcription only" vs. "full analysis").
    *   Further optimization of the frame processing and ML inference steps.

3.  **Data Schema Evolution:**
    As new plugins and features are added, the metadata schema for scenes will evolve. A long-term challenge is to implement a strategy for handling data migrations, allowing users to "upgrade" their existing indexed data to a new schema without having to re-index their entire library from scratch.

---

## 📄 License

This project is licensed under the MIT License - see the main `LICENSE.md` file for details.
