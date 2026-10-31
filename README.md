# PROOFPATH AI
> *"Know what's missing before you decide."*

**PROOFPATH AI** is a professional, web-based AI information intelligence platform engineered to investigate complex information across multiple sources and uncover **missing information**, **incomplete evidence**, **conflicting claims**, **outdated information**, **unverified assertions**, and **the critical questions you forgot to ask**.

---

## ⚡ Key Highlights
- **Not a Chatbot or Summarizer**: ProofPath treats sources as competing witness testimonies, extracting atomic claims, grounding quotes, and cross-examining assertions.
- **Decision-Readiness Index (DRI)**: Explainable, deterministic mathematical scoring (Coverage, Consistency, Freshness, Verification).
- **Anti-Hallucination Evidence Engine**: Strict substring verification against raw source text before any claim or conflict is accepted.
- **Interactive Evidence Graph**: Built with **React Flow** to visualize relationships, corroborating claims, and red-flag contradictions.
- **Live Server-Sent Events (SSE)**: Real-time stage-by-stage pipeline streaming.
- **Linear / Stripe / Notion Aesthetic**: Clean, distraction-free SaaS interface featuring warm white backgrounds, deep navy typography, and muted blue accents.

---

## 🏗️ Architecture Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, Framer Motion, React Router v7, TanStack Query v5, Zustand, Recharts, React Flow.
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy (PostgreSQL-ready with SQLite default), Pydantic v2, PyMuPDF, Trafilatura, BeautifulSoup4, Sentence-Transformers, FAISS, Gemini API, Groq API.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.12+ (with `uv` or `pip`)
- Node.js 20+ and `npm`

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Fill in your GEMINI_API_KEY (and optionally GROQ_API_KEY) in backend/.env

# Run backend API server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to explore PROOFPATH AI.
