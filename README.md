# GenHealth AI — Technical Assessment

> Medical document processing API that extracts patient data from uploaded PDFs using Google Gemini on Vertex AI.  
> Upload a medical fax or document → Gemini extracts the patient's name and DOB via structured JSON output with vision AI fallback → a structured Order record is created automatically.

---

### Live API

| | URL |
|---|---|
| **Base URL** | https://genhealth-assessment-867837156078.us-central1.run.app |
| **Swagger Docs** | https://genhealth-assessment-867837156078.us-central1.run.app/docs |
| **Frontend** | https://genhealth-assessment-867837156078.us-central1.run.app |

---

## API Endpoints

| Method | Path | Description | Status Codes |
|:-------|:-----|:------------|:-------------|
| `GET` | `/health` | Health check | `200` |
| `POST` | `/api/v1/orders/` | Create an order manually | `201` `422` |
| `GET` | `/api/v1/orders/` | List all orders (paginated) | `200` |
| `GET` | `/api/v1/orders/{id}` | Get a single order | `200` `404` |
| `PUT` | `/api/v1/orders/{id}` | Update an order | `200` `404` |
| `DELETE` | `/api/v1/orders/{id}` | Delete an order | `204` `404` |
| `POST` | `/api/v1/orders/upload` | Upload PDF → extract patient data | `201` `400` `422` `500` |
| `GET` | `/api/v1/logs/` | Activity logs (paginated, 15/page) | `200` |

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Backend** | Python 3.11, FastAPI (async endpoints) |
| **Database** | SQLite + SQLAlchemy 2.0 |
| **PDF Extraction** | PyMuPDF (text) + Gemini 2.5 Flash on Vertex AI (structured JSON + vision) |
| **Frontend** | React 19, TypeScript, Vite |
| **Deployment** | Docker → GCP Cloud Run (min 1 instance, zero cold-start) |
| **Testing** | pytest + httpx (17 tests) |

---

## Architecture

Single-container deployment serving both the FastAPI backend and the React SPA.

### PDF Extraction Pipeline

```
Upload PDF
  │
  ├─ 1. Validate ──→ empty? corrupt? encrypted? zero pages? → 400/422
  │
  ├─ 2. Extract text (PyMuPDF, in-memory, no temp files)
  │
  ├─ 3. Text > 50 chars?
  │     ├─ YES → Send first 3K chars to Gemini (structured JSON mode, temp=0)
  │     │         └─ Parse fails? → Fall back to vision path ↓
  │     │
  │     └─ NO  → Rasterize page 1 to 150 DPI JPEG
  │               └─ Send image to Gemini vision (same structured JSON mode)
  │
  └─ 4. Validate response → non-empty fields, confidence ∈ [0,1] → Create Order
```

**Key design choices:**

- **Fully async** — `async def` endpoint + `client.aio.models.generate_content()`.  
  Gemini calls don't block the event loop; the server stays responsive during extraction.
- **Structured JSON output** — `response_mime_type="application/json"` with a strict `response_schema`.  
  Forces valid JSON from the model. Eliminates retry-on-parse-failure loops entirely.
- **Client warm-up** — Gemini client is pre-initialized at startup via a lifespan handler.  
  First request pays zero initialization cost.
- **Starlette middleware** logs every request automatically (method, path, IP, UA, status, duration)  
  without polluting endpoint code.

---

## Design Decisions

<details>
<summary><strong>Why structured JSON output over free-text parsing?</strong></summary>

Using Gemini's `response_mime_type="application/json"` with a `response_schema` forces the model to return valid JSON conforming to an exact schema. This eliminates an entire class of bugs — malformed responses, markdown wrapping, missing fields — and removes the need for retry loops on parse failures. A single LLM call is sufficient in the happy path.
</details>

<details>
<summary><strong>Why in-memory PDF processing?</strong></summary>

PDF bytes are passed directly to PyMuPDF via `fitz.open(stream=...)` rather than writing to a temp file on disk. This removes filesystem I/O, avoids cleanup logic, and eliminates orphaned temp files under error conditions.
</details>

<details>
<summary><strong>Why text-first with vision fallback?</strong></summary>

Text extraction is ~100x faster than vision (50ms vs 5s for rasterization + larger payload). By trying text first and only falling back to vision for scanned documents or text extraction failures, the system optimizes for the common case while still handling edge cases.
</details>

<details>
<summary><strong>Why aggressive validation at the boundary?</strong></summary>

The upload endpoint validates file extension, size, emptiness, and PDF structural integrity before any LLM call. The extraction pipeline then validates that returned fields are non-empty strings and that confidence is a valid float in [0, 1]. This prevents garbage data from reaching the database and gives users clear, actionable error messages.
</details>

<details>
<summary><strong>Why Gemini over regex/heuristics?</strong></summary>

Medical documents have wildly varying layouts. An LLM with vision capability can extract patient data from any document format — text or scanned — without brittle pattern matching.
</details>

<details>
<summary><strong>Why SQLite over PostgreSQL?</strong></summary>

Zero setup, ideal for a timed assessment. Production migration is a one-line `.env` change to switch `DATABASE_URL`, with Alembic handling schema migrations.
</details>

<details>
<summary><strong>Why a single container?</strong></summary>

One Docker image, one Cloud Run service, no CORS issues in production — frontend and API share the same origin.
</details>

<details>
<summary><strong>Why min 1 instance on Cloud Run?</strong></summary>

Eliminates cold-start latency (~5-10s) for the first request after idle. Combined with the lifespan client warm-up, every request — including the very first — gets fast extraction times.
</details>

---

## Performance

| Optimization | Technique | Impact |
|:-------------|:----------|:-------|
| Async Gemini calls | `client.aio.models.generate_content()` | Non-blocking; server handles concurrent requests during extraction |
| Structured JSON output | `response_mime_type` + `response_schema` | Eliminates retry loops — single LLM call per extraction |
| Reduced context window | First 3K chars (not 10K) | Faster inference — patient demographics are always at the top |
| In-memory PDF processing | `fitz.open(stream=bytes)` | No disk I/O, no temp file cleanup |
| Compressed images | 150 DPI JPEG (not 200 DPI PNG) | ~50% smaller payloads on the vision path |
| Client warm-up | Lifespan startup handler | Zero initialization cost on first request |
| Always-on instance | Cloud Run `--min-instances 1` | Zero cold-start latency |

> **Typical extraction time: 2–5 seconds** (dominated by Gemini API latency, which is the irreducible floor).

---

## Error Handling

Every failure mode returns a clear, actionable message:

| Scenario | Response | Code |
|:---------|:---------|:-----|
| Non-PDF file | `Only PDF files are accepted` | `400` |
| Empty upload | `Uploaded file is empty` | `400` |
| File exceeds 10 MB | `File size exceeds 10MB limit` | `400` |
| Corrupt / unreadable PDF | `Cannot open PDF: ...` | `422` |
| Password-protected PDF | `PDF is password-protected and cannot be read` | `422` |
| PDF with no pages | `PDF has no renderable pages` | `422` |
| Gemini safety filter block | `Gemini returned no content...` | `422` |
| Missing name or DOB in result | `Extraction incomplete: 'field' could not be determined` | `422` |
| Truncated LLM response | Auto-repaired with fallback confidence | — |
| Text extraction fails | Automatic fallback to vision path | — |
| Gemini transient failure | Retry with exponential backoff (1–4s, 2 attempts) | — |

---

## Running Locally

```bash
git clone https://github.com/gavksingh/genhealth.ai.git
cd genhealth.ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Authenticate with GCP for Vertex AI:
gcloud auth application-default login

# Start the backend:
uvicorn app.main:app --reload
```

Frontend (development mode):

```bash
cd frontend && npm install && npm run dev
```

---

## Running Tests

```bash
pytest tests/ -v
```

17 tests covering CRUD operations, input validation, file type rejection, PDF upload with mocked extraction, activity log pagination, and logging behavior.

---

## Deployment

```bash
./deploy.sh
```

One command — builds the Docker image, pushes to GCR, deploys to Cloud Run, and verifies the live URL.

---

## What Was Built Beyond the Core Requirements

- **Structured JSON extraction** — `response_schema` for guaranteed valid output, text-first + vision fallback for both text-based and scanned documents
- **Comprehensive PDF validation** — upfront checks for empty, corrupt, password-protected, and zero-page PDFs with clear error messages
- **Async extraction pipeline** — non-blocking Gemini calls with pre-warmed client and zero cold-start deployment
- **Rate limiting** — 30 req/min on order creation, 5 req/min on PDF upload (slowapi)
- **API key authentication** — write operations protected via `X-API-Key` header; disabled in dev, enabled when `API_KEY` is set
- **Paginated activity logs** — server-side pagination with total count; 15 entries per page with navigation controls
- **Auto-logging middleware** — every request captured with method, path, IP, user agent, status code, response time
- **Full CRUD UI** — manual order creation, inline status editing, animated delete confirmation
- **Live health indicator** — navbar pings `/health` on mount
- **Auto-refreshing logs** — polls every 10 seconds
- **Confidence score visualization** — progress bar on extraction results
- **Mobile-responsive layout** — bottom tab navigation on small screens
- **17 passing tests**

---

## What I Would Add With More Time

- **PostgreSQL** — production persistence and concurrent write safety. SQLite is ephemeral on Cloud Run; migration is a one-line `DATABASE_URL` change.
- **GCS file storage** — keep original PDFs for audit trail, re-processing, and compliance.
- **Batch PDF processing** — accept a ZIP, process concurrently with `asyncio.gather()`, return a job status endpoint.
- **Redis caching** — for high-traffic read endpoints. Not needed at current scale.
- **JWT authentication** — refresh tokens, role-based access, multi-tenant support.
- **Correlation IDs** — trace ID per request flowing through the activity log for cross-service debugging.
- **GitHub Actions CI/CD** — test on every PR, block on failure, auto-deploy on merge to main.
