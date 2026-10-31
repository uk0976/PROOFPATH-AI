# PROOFPATH AI — Backend Engine

> **Tagline**: *"Know what's missing before you decide."*

High-performance, forensic intelligence backend providing deep claim decomposition, cross-source contradiction arbitrations, temporal decay tracking, information gap detection, counterfactual blindspot discovery, and decision-readiness scoring.

Built with **Python 3.12**, **FastAPI**, **SQLAlchemy**, **Pydantic v2**, and **SQLite / PostgreSQL-ready architecture**.

---

## ⚡ Quick Start

### 1. Prerequisites
- Python 3.12+ (e.g. `py -3.12` on Windows)
- `uv` or `pip`

### 2. Environment Setup
Create a `.env` file in `backend/` by copying `.env.example`:
```bash
cp .env.example .env
```

Key environment configuration variables:
```env
# Application Core
PROJECT_NAME="PROOFPATH AI"
VERSION="1.0.0"
DEBUG=True
HOST=0.0.0.0
PORT=8000

# CORS (Frontend React App)
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

# Database (Default: local SQLite database)
DATABASE_URL=sqlite:///./proofpath.db

# Storage Directories
UPLOAD_DIR=./uploads
REPORT_DIR=./reports

# AI Providers
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Virtual Environment & Dependencies
```bash
# Using python 3.12
py -3.12 -m venv venv

# Activate on Windows
.\venv\Scripts\activate

# Install dependencies (ultra-fast with uv)
uv pip install --system-certs -r requirements.txt
# OR standard pip:
pip install -r requirements.txt
```

### 4. Running the Backend Server
```bash
# From the backend directory
uvicorn app.main:app --reload --port 8000
```

Once running:
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)
- **API Root**: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)

---

## 🏛 Architecture & 9 Core Routers

All endpoints are mounted under `/api/v1/`:

| Router | Method & Paths | Description |
|---|---|---|
| **1. Research** | `POST /api/v1/research`<br>`GET /api/v1/research`<br>`GET /api/v1/research/{id}`<br>`DELETE /api/v1/research/{id}`<br>`POST /api/v1/research/{id}/start`<br>`GET /api/v1/research/{id}/progress` (SSE) | Lifecycle management, 7-stage pipeline triggering, and real-time Server-Sent Events progress streaming. |
| **2. Sources** | `POST /api/v1/sources/upload`<br>`POST /api/v1/sources/url`<br>`POST /api/v1/sources/text`<br>`GET /api/v1/research/{id}/sources`<br>`GET /api/v1/sources/{id}`<br>`DELETE /api/v1/sources/{id}` | Ingests PDFs (PyMuPDF with page provenance), URLs (Trafilatura/BS4), and notes. |
| **3. Requirements** | `GET /api/v1/research/{id}/requirements`<br>`POST /api/v1/research/{id}/requirements`<br>`PATCH /api/v1/requirements/{id}`<br>`DELETE /api/v1/requirements/{id}` | Goal decomposition into weighted, categorical research requirements. |
| **4. Claims** | `GET /api/v1/research/{id}/claims`<br>`GET /api/v1/claims/{id}` | Atomic factual assertions extracted with anti-hallucination quote verification. |
| **5. Findings** | `GET /api/v1/research/{id}/findings`<br>`GET /api/v1/findings/{id}`<br>`GET /api/v1/findings/{id}/conflicts`<br>`GET /api/v1/findings/{id}/gaps`<br>`GET /api/v1/findings/{id}/temporal` | Synthesis findings: cross-source contradictions, missing evidence gaps, and publication decay audits. |
| **6. Evidence** | `GET /api/v1/research/{id}/evidence`<br>`GET /api/v1/research/{id}/graph` | Requirement vs Source evidence matrix and React Flow node-edge graph. |
| **7. Blindspots** | `GET /api/v1/research/{id}/blindspots`<br>`POST /api/v1/blindspots/{id}/investigate` | Counter-factual inquiries and unasked questions discovered by devil's advocate reasoning. |
| **8. Verification** | `GET /api/v1/research/{id}/verification`<br>`PATCH /api/v1/verification/{id}` | Actionable pre-decision checklists generated from conflicts and blindspots. |
| **9. Reports** | `POST /api/v1/research/{id}/report`<br>`GET /api/v1/reports/{id}/download`<br>`GET /api/v1/reports/{id}/markdown` | Audit-grade Markdown and PDF investigation dossier generation. |

---

## 🧪 Running Automated Tests

Run the full test suite verifying all 9 routers:
```bash
# In backend/ directory with venv activated
pytest tests/ -v
```
All tests run with zero warnings and test database isolation.
