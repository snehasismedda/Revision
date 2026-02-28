# Revision - Smart Learning & Revision Platform

Revision is a modern, AI-powered study companion designed to automate the process of capturing, organizing, and reviewing educational content. Built with **React** and **Express**, it integrates **Local AI (Ollama)** to turn raw images and text into structured revision sessions.

---

## 🏗️ Project Architecture

Revision follows a modular architecture designed for local performance and high data availability.

### Backend (Express + Knex + Postgres)
- **MVC Pattern**: Specialized controllers for subjects, sessions, topics, and questions.
- **AI Pipelines**: Custom services that interface with Ollama for vision processing (OCR/parsing) and text generation.
- **Database**: PostgreSQL with Knex.js migrations for version control.

### Frontend (React + Vite)
- **Dynamic Dashboard**: Subject-level and global performance analytics.
- **Intelligent Syllabus**: Hierarchical topic management with "AI Tagging" capabilities.
- **Rich Text Rendering**: Specialized components for displaying AI-parsed educational content.
- **Session Tracking**: Track accuracy, weak areas, and progress over time.

---

## 🤖 AI Features (Powered by Ollama)

Revision uses local AI to keep your data private and avoid API costs.

1.  **Smart Parsing**: Converts raw text or messy notes into structured Question/Answer pairs.
2.  **Vision Analysis**: Uses `qwen2.5-vl` to analyze uploaded images of handwritten notes or textbooks.
3.  **Automatic Tagging**: AI analyzes questions and automatically maps them to your syllabus topics.
4.  **Note Generation**: Generate summarized study notes directly from your questions to create a "Syllabus" from your practice data.

---

## 💾 Data Persistence & Safety

We prioritize your data above all else. The system is designed to survive Docker crashes and volume corruption.

### Host-Bind Mounting
Unlike standard Docker volumes that are "hidden" in system folders, Revision maps database data directly to your project root in:
- `backend/.database/postgres` (Live database files)
- `backend/.database/backups` (Portable SQL snapshots)

### Automated Snapshots
A dedicated **Backup Container** runs alongside PostgreSQL:
- **Frequency**: Every 6 hours.
- **Rotation**: Keeps 7 days, 4 weeks, and 6 months of history.
- **Portability**: Backups are standard `.sql.gz` files that can be restored on any Postgres instance.

---

## 🚦 Getting Started

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Ollama](https://ollama.com/) (Running locally)

#### Pull Required AI Models
```bash
ollama pull qwen2.5:7b
ollama pull qwen2.5-vl
```

### 🛠️ Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials and local paths
npm install
npm run db:up         # Start Postgres & Backup Service
npm run migrate:latest # Run database schema setup
npm run dev           # Start the API (localhost:3001)
```

### 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Start the UI (localhost:5173)
```

---

## 📜 Available Commands

### Backend
| Command | Action |
| :--- | :--- |
| `npm run db:up` | Starts DB and Backup containers in detached mode |
| `npm run db:down` | Stops and removes containers |
| `npm run db:backup` | Forces an immediate SQL dump of the database |
| `npm run migrate:latest` | Applies all pending database changes |
| `npm run migrate:rollback` | Reverts the last database change |

---
