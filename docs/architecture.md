# PROOFPATH AI — System Architecture
> **Tagline**: *"Know what's missing before you decide."*

## 1. System Overview
PROOFPATH AI is a professional AI information intelligence platform engineered to investigate information across multiple sources and uncover:
- Missing information & unaddressed requirements
- Incomplete claims lacking critical parameters
- Cross-source contradictory claims
- Potentially outdated information and temporal decay
- Unverified assertions lacking empirical backing
- BlindSpot questions the user forgot to ask

Built on a decoupled client-server architecture:
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, Framer Motion, React Router v7, TanStack Query v5, Zustand, Recharts, React Flow.
- **Backend**: FastAPI, SQLAlchemy (SQLite/PostgreSQL-ready), Pydantic v2, PyMuPDF, Trafilatura, BeautifulSoup4, Sentence-Transformers, FAISS, Gemini API, Groq API.

## 2. Multi-Agent Forensic Pipeline
1. **Research Planner Agent**: Decomposes user goals into mutually exclusive, collectively exhaustive (MECE) criteria.
2. **Atomic Claim Extractor Agent**: Extracts standalone claims with exact verbatim quotes and source page/offset mapping.
3. **Evidence Matcher**: Vector similarity search (Sentence-Transformers + FAISS) mapping claims to requirements.
4. **Information Gap Detector**: Flags requirements with zero or insufficient evidence.
5. **Contradiction Analyzer Agent**: Performs pairwise and cluster cross-examination of claims to identify conflicting figures or assertions.
6. **Temporal Analyzer Agent**: Flags superseded specifications and historical decay based on document timestamps.
7. **BlindSpot Discovery Agent**: Generates critical unasked questions using counter-factual risk reasoning.
8. **Decision-Readiness Scoring Engine**: Deterministic 4-factor scoring metric (Coverage 35%, Consistency 30%, Freshness 15%, Verification 20%).

## 3. Communication & Streaming
- REST APIs with JSON payloads and multipart PDF uploads.
- Real-time Server-Sent Events (SSE) streaming at `/api/v1/research/{id}/events` updating stage progress from 0% to 100%.
