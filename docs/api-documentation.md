# PROOFPATH AI — API Documentation (`/api/v1`)

### Base URL: `http://localhost:8000/api/v1`

## 1. Research Sessions (`/research`)
- `POST /research/`: Create a new research session.
  - Body: `{ "title": string, "research_goal": string, "target_decision": string }`
- `GET /research/`: List all research sessions.
- `GET /research/{id}`: Get session details and Decision-Readiness Index (DRI).
- `POST /research/{id}/start`: Trigger the full forensic analysis pipeline in the background.
- `GET /research/{id}/events`: Server-Sent Events (SSE) stream for live progress updates.

## 2. Sources Ingestion (`/sources`)
- `POST /sources/{session_id}/upload-pdf`: Multipart upload of PDF documents.
- `POST /sources/{session_id}/add-url`: Scrape and ingest a web URL via Trafilatura.
- `POST /sources/{session_id}/add-text`: Ingest raw text or markdown memorandums.
- `GET /sources/{session_id}`: List all ingested sources with extraction statistics and dates.

## 3. Requirements (`/requirements`)
- `GET /requirements/{session_id}`: Retrieve decomposed evaluation requirements.
- `POST /requirements/{session_id}/decompose`: Trigger research planner to decompose goals.

## 4. Findings (`/findings`)
- `GET /findings/{session_id}/conflicts`: Retrieve detected contradictions with verbatim quotes.
- `GET /findings/{session_id}/gaps`: Retrieve information gaps and missing criteria.
- `GET /findings/{session_id}/temporal`: Retrieve temporal decay flags.

## 5. Evidence & Graph (`/evidence`)
- `GET /evidence/{session_id}/matrix`: Matrix view of requirements mapped to supporting/refuting claims.
- `GET /evidence/{session_id}/graph`: React Flow compatible node-edge graph payload.

## 6. BlindSpots & Reports (`/blindspots`, `/reports`)
- `GET /blindspots/{session_id}`: Retrieve discovered blind spots and unasked questions.
- `POST /blindspots/{id}/toggle`: Toggle verification status of a blind spot question.
- `GET /reports/{session_id}/summary`: Executive briefing JSON summary.
- `GET /reports/{session_id}/export?format=markdown|pdf`: Export briefing dossier.
