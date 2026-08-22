# 🎙️ vocallab — AI-Powered Intelligent Codebase Analyzer & Developer Assistant

> **Transform any GitHub codebase into interactive 2D/3D architecture graphs, RAG code reasoning, automated security audits, code impact analysis, OpenAPI spec auto-generation, and 1-click AI pull request creations.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-emerald.svg)](https://www.prisma.io/)
[![Qdrant](https://img.shields.io/badge/Qdrant-VectorStore-red.svg)](https://qdrant.tech/)
[![Groq](https://img.shields.io/badge/Groq-Cloud--LLM-orange.svg)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Executive Overview

**vocallab** is an enterprise-grade, AI-native codebase intelligence platform designed for software engineers, architects, and technical leaders. By combining **AST (Abstract Syntax Tree) code parsing**, **hybrid semantic vector embeddings (Qdrant)**, and **ultra-fast Cloud LLM reasoning (Groq Qwen 3.6 27B / Alibaba DashScope / OpenAI)**, **vocallab** enables instant comprehension, automated refactoring, and security auditing of any public or private GitHub repository.

---

## 🔥 Key Features

### 🕸️ 1. Interactive 2D/3D Architecture Graph & Connection Inspector
- **AST Dependency Graphing**: Uses `ts-morph` and CommonJS scanners to extract function calls, class hierarchies, and file imports (`require` & `import`).
- **Color-Coded Layer Categorization**: Categorizes modules into Controllers (Blue), Services (Purple), Routes (Green), Models (Amber), Components (Pink), and Utilities (Gray).
- **Click-to-Show Node Connections**: Toggle between full dependency web (150+ lines) or focused click-to-highlight mode (lights up incoming callers in **Cyan** and outgoing callees in **Purple**).
- **Full Screen ⛶ Exploration**: Immersive full-viewport graph canvas with pan/zoom controls and ESC keyboard shortcuts.

### 💬 2. RAG Codebase AI Chat Assistant
- **Semantic Code Chunking**: Chunks source files by AST function and class boundaries rather than arbitrary token splits.
- **Qdrant Vector RAG**: Performs hybrid vector similarity + keyword search to retrieve exact line snippets before querying LLMs.
- **Provider Priority Cascade**: Supports Groq Cloud API, Alibaba DashScope Qwen, OpenAI GPT-4o, and local offline Ollama models with zero storage footprint fallback.

### 🛠️ 3. Automatic AI Source Code Editor & GitHub PR Creation
- **Direct-to-Disk Code Edits**: Describe any refactoring goal (e.g. *"Replace JWT authentication with session cookie authentication"*), and the AI automatically rewrites source files and saves them directly to disk.
- **Executive Summaries**: Returns concise 2-bullet summaries of applied logic modifications instead of heavy unreadable diff blocks.
- **1-Click GitHub Pull Requests**: Creates isolated Git branches and submits Pull Requests directly to GitHub via the Octokit REST API.

### 🔒 4. AI Security & Vulnerability Auditor
- **Static & AI Analysis**: Audits code for hardcoded secrets/API keys, SQL injection vulnerabilities, CORS misconfigurations, unhandled promise rejections, and weak cryptography.
- **Security Grading**: Assigns an overall Security Rating (**A+ to F**) with actionable remediation recommendations for every flaw.

### 📄 5. Auto-Generated OpenAPI 3.0 & Markdown API Specs
- **Instant Documentation**: Scans AST route definitions, query parameters, request bodies, and controller logic to auto-generate valid **OpenAPI 3.0 JSON specifications** and interactive Markdown documentation.

### ⚡ 6. Code Impact Analysis (Blast Radius Evaluator)
- **Refactoring Risk Scoring**: Simulates modifying any target function or class (e.g., `login`, `createUser`) and calculates its blast radius.
- **Dependency Classification**: Classifies affected items into **Affected Files**, **Downstream API Endpoints**, and **Upstream UI Components** with a Risk Rating (**LOW**, **MEDIUM**, **HIGH**, **CRITICAL**).

### 🔀 7. Branch-vs-Branch Architecture Comparison
- **Architectural Drift Detection**: Compares base vs feature branches (e.g., `main` vs `feature/auth`) to highlight newly added or deleted AST symbols and structural drift before merging PRs.

### 🛡️ 8. Repository Health Audit
- **Code Quality Score**: Evaluates maintainability, test coverage indicators, lint compliance, and assigns a holistic Health Score (**0–100**).

---

## 🏗️ Architecture & Tech Stack

```
                                  +-------------------------------------------------------+
                                  |              Next.js 14 Web Interface                 |
                                  | (React Flow, Monaco Editor, Tailwind, Lucide Icons)   |
                                  +---------------------------+---------------------------+
                                                              |
                                                              | HTTP REST API
                                                              v
                                  +-------------------------------------------------------+
                                  |               Express.js Backend API                  |
                                  |  (TypeScript, Prisma ORM, ts-morph AST Parser)        |
                                  +---------+-----------------+-----------------+---------+
                                            |                 |                 |
                   +------------------------+                 |                 +------------------------+
                   |                                          |                                          |
                   v                                          v                                          v
+------------------+------------------+    +------------------+------------------+    +------------------+------------------+
|           Prisma Database           |    |       Qdrant Vector Store        |    |       Groq / Qwen / OpenAI     |
|   (SQLite / PostgreSQL Metadata)    |    |  (768d Code Embeddings Index)    |    |  (qwen3.6-27b Cloud LLM Engine)  |
+-------------------------------------+    +-------------------------------------+    +-------------------------------------+
```

### Monorepo Structure

```
vocallab/
├── apps/
│   ├── frontend/                 # Next.js 14 App Router UI
│   │   ├── app/                  # Workspace Pages (/repository/[id])
│   │   ├── components/           # React Flow Graph, Monaco Viewer, Chat Window
│   │   └── tailwind.config.ts    # Custom Dark Glassmorphism Design Tokens
│   │
│   └── backend/                  # Express.js API & AI Engine
│       ├── prisma/               # Database Schema (File, Symbol, Chunk, Dependency)
│       └── src/
│           ├── config/           # Environment Variables & Dotenv Loaders
│           ├── database/         # Prisma Client Instance
│           ├── modules/
│           │   ├── agent/        # Change Planner & Direct-to-Disk Code Generator
│           │   ├── analysis/     # Impact Analysis, Architecture Summary, Branch Diff
│           │   ├── ast/          # ts-morph AST & CommonJS require Parser
│           │   ├── documentation/# OpenAPI 3.0 & Markdown Spec Generator
│           │   ├── github/       # GitHub Repository Ingestion & Octokit PR Creator
│           │   ├── graph/        # React Flow Dependency Graph Engine
│           │   ├── health/       # Repository Health Auditor
│           │   ├── llm/          # Groq, Qwen, DashScope, OpenAI & Ollama Service
│           │   ├── rag/          # Qdrant Vector Search & RAG Context Extractor
│           │   └── security/     # Vulnerability & Secret Auditor
│           └── routes/           # REST API Endpoints
│
└── packages/
    └── shared/                   # Shared TypeScript Interfaces & Types (@vocallab/shared)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher (v20.x recommended)
- **npm**: v9.x or higher
- **Git**: Installed on your system

---

### 🔑 Environment Variables Setup

Create an `.env` file inside `apps/backend/.env`:

```env
PORT=4000
DATABASE_URL="file:./dev.db"
QDRANT_URL="http://localhost:6333"

# Cloud LLM API Keys (Choose any or leave empty for offline mode)
GROQ_API_KEY="gsk_your_groq_api_key"        # Recommended: 100% Free ultra-fast Qwen 3.6 27B
DASHSCOPE_API_KEY=""                        # Optional: Alibaba Cloud Qwen
OPENAI_API_KEY=""                           # Optional: OpenAI GPT-4o
GITHUB_TOKEN=""                             # Optional: For private repos & 1-click PR creation

REPOS_DIR="./temp_repos"
```

---

### 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/vocallab.git
   cd vocallab
   ```

2. **Install all workspace dependencies**:
   ```bash
   npm install
   ```

3. **Build shared types & backend Prisma database**:
   ```bash
   # Build shared package
   npm --prefix packages/shared run build

   # Generate Prisma client & sync DB
   npx prisma db push --schema apps/backend/prisma/schema.prisma
   ```

---

### 🏃 Running Locally

Start both the backend and frontend dev servers concurrently:

```bash
# Terminal 1: Backend Server (Port 4000)
npm --prefix apps/backend run dev

# Terminal 2: Frontend Client (Port 3000)
npm --prefix apps/frontend run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/repositories` | `POST` | Ingests and parses a GitHub repository URL |
| `/api/repositories` | `GET` | Lists all indexed repositories |
| `/api/repositories/:id` | `GET` | Retrieves repository metadata and status |
| `/api/repositories/:id/files` | `GET` | Fetches indexed file inventory |
| `/api/repositories/:id/file-content` | `GET` | Reads file source code for Monaco Viewer |
| `/api/repositories/:id/graph` | `GET` | Returns React Flow nodes and dependency edges |
| `/api/repositories/:id/architecture` | `GET` | Returns Qwen AI Architecture Summary |
| `/api/repositories/:id/chat` | `POST` | Queries codebase RAG assistant |
| `/api/repositories/:id/impact` | `POST` | Runs Code Impact Analysis for a symbol |
| `/api/repositories/:id/plan-change` | `POST` | Generates & applies AI code edits to disk |
| `/api/repositories/:id/create-pr` | `POST` | Submits AI code modifications as a GitHub PR |
| `/api/repositories/:id/docs` | `GET` | Auto-generates OpenAPI 3.0 specification |
| `/api/repositories/:id/security` | `GET` | Generates AI Security & Vulnerability Report |
| `/api/repositories/:id/health` | `GET` | Generates Repository Health Score & Audit |
| `/api/repositories/:id/compare-branches`| `POST` | Compares base vs feature branch symbols |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/vocallab/issues).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
