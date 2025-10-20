# 🎬 Edit Mind — AI-Powered Video Indexing & Semantic Search

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Made with Electron](https://img.shields.io/badge/Built%20with-Electron-blue.svg)](https://www.electronjs.org/)
[![ChromaDB](https://img.shields.io/badge/VectorDB-ChromaDB-purple.svg)](https://www.trychroma.com/)

> ⚠️ **Development Status:** Edit Mind is currently in **active development** and **not yet production-ready**.  
> Expect incomplete features and occasional bugs. We welcome contributors to help us reach **v1.0**!

---

### 🧠 Your Video Library, Reimagined

**Edit Mind** is a cross-platform desktop app that acts as an **editor’s second brain**.  
It locally indexes your entire video library, generating deep metadata using **AI analysis** — including:

- 🎙 Full transcriptions  
- 👤 Recognized faces  
- 🎨 Dominant colors  
- 📦 Detected objects  
- 🔤 On-screen text (OCR)  

This creates a **fully searchable, offline-first video database**, letting you find the exact shot you need in seconds.

---

## ⚙️ How It Works

When you add a video, Edit Mind runs a complete **AI-powered local analysis pipeline**:

1. **🎙 Full Transcription** — Extracts and transcribes the audio track using a local [OpenAI Whisper](https://github.com/openai/whisper) model for time-stamped dialogue.  
2. **🎞 Scene Segmentation** — Splits the video into 2-second “Scenes” for precise frame-level indexing.  
3. **🧩 Deep Frame Analysis** — Each Scene is analyzed by Python plugins to:
   - Recognize faces  
   - Detect objects  
   - Perform OCR (on-screen text)  
   - Analyze colors and composition  
4. **🧠 Data Consolidation** — Aligns spoken text with visual content using timestamps.  
5. **🔍 Vector Embedding & Storage** — All extracted data (transcripts, tags, and metadata) are embedded using **Google Text Embedding Models** and stored locally in **[ChromaDB](https://www.trychroma.com/)**.  
6. **🗣 Semantic Search Parsing** — When you search in natural language (e.g. _“show me all clips where Ilias looks happy”_), Edit Mind uses **Google Gemini 2.5 Pro** to convert your search prompt into a structured JSON query.  
   This query is then executed locally against the ChromaDB vector store to retrieve relevant scenes.

---

> 💡 **Privacy by Design:**  
> All video files, frames, and extracted metadata remain fully **local**.  
> The only cloud-based component is the **Gemini API call for search prompt interpretation** and **Google text embedding generation** — no raw video are ever uploaded.  
> In a future update, Edit Mind will include the option to use **offline embedding and query models** for completely disconnected operation.


---

## ✨ Features

| Category | Description |
|-----------|-------------|
| 🔒 **Privacy-First** | 100% local AI processing. Your videos never leave your device. |
| 🧠 **Deep Indexing** | Extracts transcription, faces, objects, text, and colors automatically. |
| 🔍 **Semantic Search** | Search your videos by meaning, not just filenames — e.g. “scenes with two people talking at a table.” |
| 🎬 **AI-Generated Rough Cuts** | Describe your desired sequence in natural language: <br>`“Give me all clips where @ilias looks happy.”` <br> Edit Mind finds matching scenes and assembles a rough cut. |
| 💻 **Cross-Platform** | Runs on macOS, Windows, and Linux (Electron). |
| 🧩 **Plugin-Based Architecture** | Easily extend analysis capabilities with Python plugins (e.g. logo detection, emotion analysis). |
| 🪄 **Modern UI** | Built with React, TypeScript, and [shadcn/ui](https://ui.shadcn.com/) for a clean, responsive experience. |

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


## 🛠️ Tech Stack

| Area | Technology |
|-------|-------------|
| **App Framework** | [Electron](https://www.electronjs.org/) |
| **Frontend** | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **UI / Styling** | [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend (Main)** | [Node.js](https://nodejs.org/) |
| **AI / ML** | [Python](https://www.python.org/), [OpenCV](https://opencv.org/), [PyTorch](https://pytorch.org/), Whisper |
| **Vector Database** | [ChromaDB](https://www.trychroma.com/) |
| **Packaging** | [Electron Builder](https://www.electron.build/) |
| **Linting / Formatting** | [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) **v22+**
- [Python](https://www.python.org/downloads/) **v3.9+**
- **Recommended Hardware:** Multi-core CPU, modern GPU, and at least 8GB RAM.

---

## Installation

```bash
# Clone the repo
git clone https://github.com/iliashad/edit-mind
cd edit-mind
```
### Install Node.js dependencies
```bash
npm install
```

### Set up the Python environment
```bash
python -m venv .venv
source .venv/bin/activate   # (macOS/Linux)
# .\.venv\Scripts\activate  # (Windows)
pip install -r python/requirements.txt
```

### Running the Application

With the setup complete, you can start the application in development mode.

```bash
npm run dev
```

## 🏗️ Building for Production

To create a distributable package for your operating system, use the build command:

```bash
npm run build:mac
```

This will generate an installer or executable in the `out/` directory, configured according to `electron-builder.yml`.

## 📂 Project Structure

The project is organized to maintain a clear separation of concerns:

- `app/`: Contains all the React frontend code (pages, components, hooks, styles). This is the renderer process.
- `lib/`: Contains the core Electron application logic.
  - `main/`: The Electron main process entry point and core backend services.
  - `preload/`: The preload script for securely bridging the main and renderer processes.
  - `conveyor/`: A custom-built, type-safe IPC (Inter-Process Communication) system.
  - `services/`: Node.js services that orchestrate tasks like calling Python scripts.
- `python/`: Home to all Python scripts for AI/ML analysis, transcription, and more.
- `resources/`: Static assets that are not part of the web build, like the application icon.

## 🧑‍💻 How to Contribute

We welcome contributions of all kinds! Here are a few ways you can help:

- **Reporting Bugs:** If you find a bug, please open an issue.
- **Improving the UI:** Have ideas to make the interface better? We'd love to hear them.
- **Creating a Plugin:** The analysis pipeline is built on plugins. If you have an idea for a new analyzer (e.g., logo detection, audio event classification), this is a great place to start. Check out the existing plugins in the `python/plugins/` directory to see how they work.

## 🤝 Contributing

As an open-source project in its early stages, we are actively looking for contributors. Whether it's fixing bugs, adding new analysis plugins, or improving the UI, your help is invaluable.

Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

## 🙏 Acknowledgements

This project was bootstrapped from the excellent [guasam/electron-react-app](https://github.com/guasam/electron-react-app) template. It provided a solid foundation with a modern Electron, React, and Vite setup, which allowed us to focus on building the core features of Edit Mind.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.