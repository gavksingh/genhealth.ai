# GenHealth AI — Technical Assessment

Medical document processing API that extracts patient data from uploaded PDF documents using Google Gemini on Vertex AI. Users upload medical faxes/documents, Gemini extracts the patient's name and date of birth via vision AI, and the system creates a structured Order record. All API activity is automatically logged.

## Live API

- **Base URL**: https://genhealth-assessment-867837156078.us-central1.run.app
- **API Docs (Swagger)**: https://genhealth-assessment-867837156078.us-central1.run.app/docs
- **Frontend**: https://genhealth-assessment-867837156078.us-central1.run.app

## API Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| GET | /health | Health check | 200 |
| POST | /api/v1/orders/ | Create an order manually | 201, 422 |
| GET | /api/v1/orders/ | List all orders (paginated) | 200 |
| GET | /api/v1/orders/{id} | Get a single order | 200, 404 |
| PUT | /api/v1/orders/{id} | Update an order | 200, 404 |
| DELETE | /api/v1/orders/{id} | Delete an order | 204, 404 |
| POST | /api/v1/orders/upload | Upload PDF, extract patient data | 201, 400, 422, 500 |
| GET | /api/v1/logs/ | List activity logs (paginated) | 200 |

## Tech Stack

- **Backend**: Python 3.11 + FastAPI
- **Database**: SQLite + SQLAlchemy 2.0
- **PDF Extraction**: PyMuPDF (text) + Google Gemini 2.5 Flash on Vertex AI (LLM/vision)
- **Frontend**: React + TypeScript + Vite
- **Deployment**: Docker + GCP Cloud Run
- **Testing**: pytest + httpx

## Architecture

The application is a single-container deployment serving both the FastAPI backend and the React frontend. PDF uploads are processed in two stages: PyMuPDF extracts raw text from text-based PDFs, while scanned documents are converted to images and sent to Gemini's vision API. All API requests are automatically logged via Starlette middleware. The frontend communicates with the backend via REST API endpoints prefixed under `/api/v1`.

## Design Decisions

- **SQLite over PostgreSQL**: Zero setup, ideal for a timed assessment. Production migration is a one-line `.env` change to switch `DATABASE_URL`.
- **Gemini on Vertex AI over regex/heuristics**: Medical documents have wildly varying layouts. An LLM with vision capability can extract patient data from any document format — text or scanned — without brittle pattern matching.
- **PyMuPDF for text extraction**: Fast, pure-Python PDF library that handles both text extraction and page-to-image conversion, avoiding the need for separate tools like Tesseract.
- **Starlette middleware for logging**: Captures every request automatically without polluting endpoint code. Silently fails so logging never crashes the API.
- **Single container (backend + frontend)**: Simplifies deployment — one Docker image, one Cloud Run service, no CORS issues in production since frontend and API share the same origin.

## Running Locally

```bash
git clone https://github.com/gavksingh/genhealth.ai.git
cd genhealth.ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set up GCP credentials for Vertex AI:
gcloud auth application-default login
# Start the server:
uvicorn app.main:app --reload
```

For the frontend (development mode):
```bash
cd frontend
npm install
npm run dev
```

## Running Tests

```bash
source .venv/bin/activate
pytest tests/ -v
```

## Deployment

```bash
./deploy.sh
```

## What Was Built Beyond the Core Requirements

- **Gemini 2.5 Flash vision AI** for PDF extraction — handles both text-based
  and fully scanned documents with 100% confidence on the sample PDF
- **Activity logging middleware** captures every request automatically with
  method, path, IP, user agent, status code, and response time
- **Manual order creation form** in the UI — full CRUD is accessible without
  touching the API directly
- **Inline status editing** on each order row — no page reload required
- **Animated delete confirmation** — row flashes rose-50 with confirm/cancel
  before any destructive action
- **Live health indicator** in the navigation bar — pings /health on mount
- **Auto-refreshing activity log** — updates every 10 seconds silently
- **Confidence score visualization** with a progress bar on extraction results
- **Mobile-responsive layout** with bottom tab navigation on small screens
- **16 passing tests** covering CRUD, validation, file type rejection, and
  activity logging behavior

## What I Would Add With More Time

- **PostgreSQL** for production persistence and concurrent write safety.
  SQLite is ephemeral on Cloud Run — data resets on redeploy. Migration is
  a one-line DATABASE_URL change with Alembic handling schema.
- **Async PDF processing queue** using Cloud Tasks or Celery so large document
  uploads return immediately with a job ID and the client polls for completion.
  Right now extraction blocks the HTTP request.
- **GCS file storage** for uploaded PDFs — keeping originals for audit trail,
  re-processing, and compliance. Currently processed in memory only.
- **JWT authentication** with refresh tokens and role-based access so only
  authorized users can create or modify orders.
- **Rate limiting** on the upload endpoint specifically — PDF extraction is
  LLM-backed and costs money per call.
- **Structured logging with correlation IDs** — each request gets a trace ID
  that flows through the activity log, making debugging across services
  tractable.
- **GitHub Actions CI/CD** — run tests on every PR, block merges on failure,
  auto-deploy to Cloud Run on main push.
- **Batch PDF processing** — accept a ZIP of PDFs and process them
  concurrently, returning a job status endpoint.
