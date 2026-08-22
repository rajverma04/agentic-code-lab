# 🚀 Agentic CodeLab — AI-Powered Intelligent Codebase Analyzer & Developer Assistant

> **Transform any GitHub codebase into interactive 2D architecture graphs, RAG code reasoning, automated security audits, code impact analysis, OpenAPI 3.0 spec auto-generation, and 1-click AI pull request creations.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-emerald.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Supabase-PostgreSQL-blue.svg)](https://supabase.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-VectorStore-red.svg)](https://qdrant.tech/)
[![Groq](https://img.shields.io/badge/Groq-Cloud--LLM-orange.svg)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Executive Overview

**Agentic CodeLab** is an enterprise-grade, AI-native codebase intelligence platform designed for software engineers, architects, and technical leaders. By combining **AST (Abstract Syntax Tree) code parsing**, **hybrid semantic vector embeddings (Qdrant)**, **managed cloud databases (Supabase PostgreSQL)**, and **ultra-fast Cloud LLM reasoning (Groq Qwen 3.6 27B / Alibaba DashScope / OpenAI)**, **Agentic CodeLab** enables instant comprehension, automated refactoring, and security auditing of any public or private GitHub repository.

---

## 🔄 Complete Data Workflow Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                  INDEPENDENT AGENTIC WORKFLOW PIPELINE                            |
+---------------------------------------------------------------------------------------------------+

[STEP 1: INGESTION PIPELINE]
User Submits GitHub URL ──► Clone Repository to Disk ──► Scan AST Symbols (ts-morph)
                                                                 │
                                                                 ▼
                                                  Build Dependency Edges & Graph
                                                                 │
                                                                 ▼
                                                  Create Semantic Code Chunks
                                                                 │
                                              ┌──────────────────┴──────────────────┐
                                              ▼                                     ▼
                                    Qdrant Vector Index                  Supabase PostgreSQL DB

───────────────────────────────────────────────────────────────────────────────────────────────────

[STEP 2: RUNTIME AI & RAG QUERY PIPELINE]
User Question ──► Generate Vector Embedding ──► Hybrid Qdrant & SQL Retrieval ──► Groq Qwen AI LLM
                                                                                         │
                                                                                         ▼
                                                                           Clean Markdown Response
                                                                           with Code Citations

───────────────────────────────────────────────────────────────────────────────────────────────────

[STEP 3: AUTOMATED REFACTORING & PR PIPELINE]
Refactor Goal ──► Change Planner Agent ──► Apply Edits Directly to Local Disk ──► Submit GitHub PR
```

---

## 📊 End-to-End Data Workflow Stages

```mermaid
flowchart TD
    A[User Enters GitHub URL] --> B[Backend Clones Repo to Disk]
    B --> C[AST Symbol Extractor: ts-morph & Regex]
    C --> D[Prisma Stores Files & Symbols in Supabase]
    C --> E[Graph Engine Builds Dependency Edges]
    C --> F[Semantic Chunker Creates Code Chunks]
    F --> G[Generate Embeddings & Index in Qdrant]
    G --> H[Status Changes to READY 100%]

    H --> I[User Asks Question / Requests Refactor]
    I --> J{Action Type}
    J -->|Code Question| K[RAG Engine Fetches Relevant Chunks]
    K --> L[Groq Qwen 3.6 LLM Generates Explanation]
    J -->|Impact Analysis| M[Blast Radius Evaluator Maps Dependent Files]
    J -->|Code Refactor| N[Change Planner Rewrites Source Files on Disk]
    N --> O[Octokit REST API Creates GitHub Branch & PR]
```

---

## 🔥 Key Features & Agentic Roles

### 🕸️ 1. Interactive 2D Architecture Graph & Connection Inspector
- **AST Dependency Graphing**: Uses `ts-morph` and CommonJS scanners to extract function calls, class hierarchies, and file imports (`require` & `import`).
- **Color-Coded Layer Categorization**: Categorizes modules into Controllers (Blue), Services (Purple), Routes (Green), Models (Amber), Components (Pink), and Utilities (Gray).
- **Click-to-Show Node Connections**: Toggle between full dependency web or focused click-to-highlight mode (lights up incoming callers in **Cyan** and outgoing callees in **Purple**).
- **Full Screen ⛶ Exploration**: Immersive full-viewport graph canvas with pan/zoom controls and ESC keyboard shortcuts.

### 💬 2. RAG Codebase AI Chat Assistant
- **Semantic Code Chunking**: Chunks source files by AST function and class boundaries rather than arbitrary token splits.
- **Qdrant Vector RAG**: Performs hybrid vector similarity + keyword search to retrieve exact line snippets before querying LLMs.
- **Provider Priority Cascade**: Supports Groq Cloud API (`qwen/qwen3.6-27b`), Alibaba DashScope Qwen, OpenAI GPT-4o, and local offline Ollama models with zero storage footprint fallback.
- **`<think>` Tag Sanitization**: Automatically strips internal LLM chain-of-thought tags for clean, professional output.

### 🛠️ 3. Automatic AI Source Code Editor & 1-Click GitHub PR Creation
- **Direct-to-Disk Code Edits**: Describe any refactoring goal (e.g. *"Replace JWT authentication with session cookie authentication"*), and the AI automatically rewrites source files and saves them directly to disk.
- **1-Click GitHub Pull Requests**: Creates isolated Git branches and submits Pull Requests directly to GitHub via the Octokit REST API.

### 💡 4. AI Suggested Targets & Refactoring Proposals
- **Discovered Symbol Chips**: Automatically extracts key functions and classes from the cloned repository and presents them as clickable chips in the **Impact Analysis** tab.
- **Project-Specific Refactoring Proposals**: Offers pre-analyzed AI refactoring goals tailored to the cloned codebase.

### 🔒 5. AI Security & Vulnerability Auditor
- **Static & AI Analysis**: Audits code for hardcoded secrets/API keys, SQL injection vulnerabilities, CORS misconfigurations, unhandled promise rejections, and weak cryptography.
- **Security Grading**: Assigns an overall Security Rating (**A+ to F**) with actionable remediation recommendations for every flaw.

### 📄 6. Auto-Generated OpenAPI 3.0 & Markdown API Specs
- **Instant Documentation**: Scans AST route definitions, query parameters, request bodies, and controller logic to auto-generate valid **OpenAPI 3.0 JSON specifications** (with 1-click JSON download) and interactive Markdown documentation.

### ⚡ 7. Code Impact Analysis (Blast Radius Evaluator)
- **Refactoring Risk Scoring**: Simulates modifying any target function or class (e.g., `login`, `createProblem`) and calculates its blast radius.
- **Dependency Classification**: Classifies affected items into **Affected Files**, **Downstream API Endpoints**, and **Upstream UI Components** with a Risk Rating (**LOW**, **MEDIUM**, **HIGH**, **CRITICAL**).

### 🗑️ 8. Clean Repository Deletion
- **1-Click Project Delete**: Allows users to delete cloned repositories both from the Landing Page list and Workspace header, purging database records in Supabase and deleting cloned source files from disk.

---

## 🏗️ Architecture & Tech Stack

```
                                  +-------------------------------------------------------+
                                  |            Next.js 14 Web Client (Vercel)             |
                                  | (React Flow, Monaco Editor, Tailwind, Lucide Icons)   |
                                  +---------------------------+---------------------------+
                                                              |
                                                              | HTTP REST API
                                                              v
                                  +-------------------------------------------------------+
                                  |             Express.js Backend API (Render)           |
                                  |  (TypeScript, Prisma ORM, ts-morph AST Parser)        |
                                  +---------+-----------------+-----------------+---------+
                                            |                 |                 |
                   +------------------------+                 |                 +------------------------+
                   |                                          |                                          |
                   v                                          v                                          v
+------------------+------------------+    +------------------+------------------+    +------------------+------------------+
|           Prisma Database           |    |       Qdrant Vector Store        |    |        Groq / Qwen Cloud LLM        |
|    (Supabase Cloud PostgreSQL)      |    |  (768d Code Embeddings Index)    |    |   (qwen/qwen3.6-27b 0 MB Disk)   |
+-------------------------------------+    +-------------------------------------+    +-------------------------------------+
```

### Monorepo Structure

```
agentic-code-lab/
├── apps/
│   ├── frontend/                 # Next.js 14 App Router UI
│   │   ├── app/                  # Workspace Pages (/repository/[id])
│   │   ├── components/           # React Flow Graph, Monaco Viewer, Chat Window, Navbar
│   │   └── lib/                  # Centralized API Base URL Helper
│   │
│   └── backend/                  # Express.js API & AI Engine
│       ├── prisma/               # Database Schema (PostgreSQL Datasource)
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
│           │   ├── llm/          # Groq Cloud Qwen AI Service
│           │   ├── rag/          # Qdrant Vector Search & Intelligent Global RAG Engine
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
DATABASE_URL="postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

QDRANT_URL="http://localhost:6333"

# Cloud LLM API Keys (Groq 100% Free Cloud LLM Engine)
GROQ_API_KEY="gsk_your_groq_api_key"
GITHUB_TOKEN=""                             # Optional: For private repos & 1-click PR creation

REPOS_DIR="./temp_repos"
```

Create `.env.local` inside `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

### 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rajverma04/agentic-code-lab.git
   cd agentic-code-lab
   ```

2. **Install workspace dependencies**:
   ```bash
   npm install
   ```

3. **Build shared types & sync database schema**:
   ```bash
   # Build shared package
   npm --prefix packages/shared run build

   # Sync Prisma database schema to Supabase PostgreSQL
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
| `/api/repositories/:id` | `DELETE` | Deletes repository record and purges disk files |
| `/api/repositories/:id/files` | `GET` | Fetches indexed file inventory |
| `/api/repositories/:id/symbols` | `GET` | Extracts key AST symbols for AI suggestion chips |
| `/api/repositories/:id/file-content` | `GET` | Reads file source code for Monaco Viewer |
| `/api/repositories/:id/graph` | `GET` | Returns React Flow nodes and dependency edges |
| `/api/repositories/:id/architecture` | `GET` | Returns Qwen AI Architecture Summary |
| `/api/chat` | `POST` | Queries codebase RAG assistant |
| `/api/repositories/:id/impact` | `POST` | Runs Code Impact Analysis for a symbol |
| `/api/repositories/:id/plan-change` | `POST` | Generates & applies AI code edits to disk |
| `/api/repositories/:id/create-pr` | `POST` | Submits AI code modifications as a GitHub PR |
| `/api/repositories/:id/docs` | `GET` | Auto-generates OpenAPI 3.0 specification |
| `/api/repositories/:id/security` | `GET` | Generates AI Security & Vulnerability Report |
| `/api/repositories/:id/health` | `GET` | Generates Repository Health Score & Audit |
| `/api/repositories/:id/compare-branches`| `POST` | Compares base vs feature branch symbols |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/rajverma04/agentic-code-lab/issues).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
