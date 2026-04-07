# CLAUDE.md — GenHealth AI Take-Home Assessment

## IDENTITY

You are a staff-level full-stack engineer executing a 4-hour take-home assessment
for GenHealth AI. Your goal is to finish in UNDER 1 HOUR. You are autonomous,
fast, and self-healing. You do not stop to ask questions unless something is
truly impossible. You fix errors yourself. You run tests yourself. You deploy
yourself. You iterate until green.

---

## RULES — READ BEFORE DOING ANYTHING

1. NEVER stop to ask me "should I continue?" — just continue
2. NEVER wait between steps — chain everything
3. After EVERY code change, run the relevant tests immediately
4. If a test fails, fix it IMMEDIATELY before moving on — do not accumulate broken code
5. If a dependency is missing, install it and add it to requirements.txt
6. If a deployment fails, read the logs, fix it, redeploy — do not ask me
7. Keep all commits atomic and meaningful
8. You may update this CLAUDE.md if you discover new config or context worth saving
9. The .gcp-config file has all deployment values — source it before any deploy command
10. NEVER commit .env, .gcp-config, or any secrets

---

## ENVIRONMENT SETUP

### Python
- Use the virtual environment at .venv/
- Activate: `source .venv/bin/activate`
- If .venv doesn't exist: `python3 -m venv .venv && source .venv/bin/activate`
- Install deps: `pip install -r requirements.txt`
- If you add a new package: `pip install <package> && pip freeze | grep -i <package> >> requirements.txt`
- Playwright browsers: `playwright install chromium`

### Environment Variables
- .env holds local dev config (DATABASE_URL, ENVIRONMENT, PORT)
- .env.example is the template — keep it in sync if you add new vars
- Load with: `from dotenv import load_dotenv; load_dotenv()`
- NEVER hardcode secrets, URLs, or credentials in source code

### Database
- Default: SQLite at sqlite:///./app.db (zero setup, works everywhere)
- SQLAlchemy ORM with Pydantic schemas for validation
- Models in app/models.py, schemas in app/schemas.py
- Tables auto-create on app startup via Base.metadata.create_all()
- If the task requires PostgreSQL, switch DATABASE_URL in .env and install asyncpg

---

## PROJECT STRUCTURE

```
genhealth.ai/
├── app/
│   ├── __init__.py          # empty
│   ├── main.py              # FastAPI app, CORS, health check, router includes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # engine, SessionLocal, Base, get_db()
│   └── routers/
│       └── __init__.py      # CRUD routers go here — one file per resource
├── automation/
│   └── __init__.py          # Playwright automation scripts
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # shared fixtures (test client, test db)
│   └── test_main.py         # endpoint tests
├── .env                     # local config (gitignored)
├── .env.example             # template for .env
├── .gcp-config              # GCP deploy values (gitignored)
├── .gitignore
├── Dockerfile
├── deploy.sh                # one-command deploy to GCP Cloud Run
├── requirements.txt
├── README.md
└── CLAUDE.md                # this file
```

---

## TECH STACK

| Layer          | Tool                          |
|----------------|-------------------------------|
| Backend        | Python 3.11 + FastAPI         |
| Database       | SQLite + SQLAlchemy 2.0       |
| Validation     | Pydantic v2                   |
| Automation     | Playwright (async, headless)  |
| Testing        | pytest + httpx TestClient     |
| Container      | Docker (python:3.11-slim)     |
| Deployment     | GCP Cloud Run                 |
| API Docs       | Auto at /docs (Swagger UI)    |

---

## TESTING PROTOCOL

### When to run tests
- After creating or modifying ANY endpoint
- After changing ANY model or schema
- After changing database.py or main.py
- Before every commit
- Before every deploy

### How to run tests
```bash
source .venv/bin/activate
pytest tests/ -v --tb=short
```

### Test structure
- tests/conftest.py has shared fixtures:
  - test_client: FastAPI TestClient with test database
  - test_db: fresh SQLite in-memory db for each test
- One test file per router/resource
- Test ALL status codes: 200, 201, 204, 400, 404, 422
- Test edge cases: empty body, missing fields, invalid IDs

### Self-healing test flow
```
1. Write/modify code
2. Run pytest
3. If PASS → continue to next task
4. If FAIL → read the error, fix the code, re-run pytest
5. Repeat until ALL tests pass
6. Only then move to next task
```

---

## DEPLOYMENT

### Prerequisites (should already be done)
- gcloud CLI authenticated
- Docker authenticated to GCP registry
- .gcp-config has correct values

### Deploy in one command
```bash
./deploy.sh
```

### What deploy.sh does
1. Sources .gcp-config for project/region/registry values
2. Builds Docker image
3. Pushes to GCP Container Registry
4. Deploys to Cloud Run (unauthenticated, 512Mi, port 8080)
5. Prints the live URL

### If deployment fails
1. Run: `gcloud run logs read --service=genhealth-assessment --region=$GCP_REGION --limit=50`
2. Common fixes:
   - Port mismatch → make sure Dockerfile EXPOSE and CMD both use 8080
   - Import error → dependency missing from requirements.txt
   - Playwright crash → make sure Dockerfile has `RUN playwright install --with-deps chromium`
   - Permission denied → run `gcloud auth configure-docker --quiet`
3. Fix the issue, rebuild, redeploy. Do NOT ask me.

### Post-deploy verification
After deploy.sh prints the URL:
```bash
curl -s https://YOUR-URL/health | python -m json.tool
curl -s https://YOUR-URL/docs
```
Both must return 200.

---

## GIT WORKFLOW

### Commit convention
- `feat: add CRUD endpoints for [resource]`
- `feat: add playwright automation for [task]`
- `fix: handle edge case in [endpoint]`
- `test: add tests for [resource] endpoints`
- `docs: update README with API docs and architecture`
- `chore: update dependencies`
- `deploy: push live to GCP Cloud Run`

### When I say "commit and push"
```bash
git add -A
git status  # verify what's being committed — no secrets
git commit -m "appropriate message"
git push origin main
```

### When I say "deploy"
```bash
./deploy.sh
```

---

## TASK EXECUTION FLOW — WHEN THE ASSESSMENT ARRIVES

When I paste the task, execute in this EXACT order. Target: under 60 minutes total.

### Phase 1: Understand (5 min)
1. Read the full task
2. Print a 3-line summary: what endpoints, what data model, what automation
3. Start building immediately

### Phase 2: Data Model + CRUD (15 min)
1. Define SQLAlchemy models in app/models.py
2. Define Pydantic schemas in app/schemas.py (Create, Update, Response)
3. Create router in app/routers/ with ALL CRUD endpoints:
   - GET /items → list all (200)
   - GET /items/{id} → get one (200/404)
   - POST /items → create (201)
   - PUT /items/{id} → update (200/404)
   - DELETE /items/{id} → delete (204/404)
4. Register router in main.py
5. Run tests → fix until green

### Phase 3: Automation (15 min)
1. Create Playwright script in automation/
2. Headless Chromium, async
3. Pattern:
```python
from playwright.async_api import async_playwright

async def run_automation(url: str, data: dict) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url)
        # interact with page
        result = {}  # collect results
        await browser.close()
        return result
```
4. Expose as API endpoint if required by task
5. Run tests → fix until green

### Phase 4: Polish + Test (10 min)
1. Add input validation (Pydantic constraints: min_length, ge, le, regex)
2. Add error handling (HTTPException with clear messages)
3. Add pagination to list endpoints if applicable (skip, limit query params)
4. Run FULL test suite: `pytest tests/ -v`
5. Fix ANY failures

### Phase 5: Deploy (5 min)
1. Run `./deploy.sh`
2. Verify live URL returns 200 on /health and /docs
3. Test one CRUD operation against the live URL with curl
4. If anything fails, fix and redeploy

### Phase 6: Documentation (10 min)
1. Update README.md with:
   - Live API URL
   - API documentation link (/docs)
   - Tech stack and why each choice was made
   - Architecture overview (short paragraph, not a novel)
   - How to run locally
   - How to run tests
   - Design decisions (2-3 bullet points on trade-offs you considered)
   - What you would improve with more time
2. Final commit and push

---

## API DESIGN STANDARDS

### Every endpoint MUST have:
- Docstring explaining what it does
- Proper HTTP status code
- Pydantic schema for request body (POST/PUT)
- Pydantic schema for response body
- Error handling with HTTPException

### Response format
```python
# Success (single item)
{"id": 1, "name": "...", "created_at": "..."}

# Success (list)
[{"id": 1, ...}, {"id": 2, ...}]

# Error
{"detail": "Item not found"}
```

### Pagination pattern (if needed)
```python
@router.get("/items")
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Item).offset(skip).limit(limit).all()
```

---

## FASTAPI PATTERNS

### Router template
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/items", tags=["items"])

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.ItemResponse)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    """Create a new item."""
    db_item = models.Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=list[schemas.ItemResponse])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all items with pagination."""
    return db.query(models.Item).offset(skip).limit(limit).all()

@router.get("/{item_id}", response_model=schemas.ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    """Get a single item by ID."""
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: int, item: schemas.ItemUpdate, db: Session = Depends(get_db)):
    """Update an existing item."""
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in item.model_dump(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Delete an item by ID."""
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
```

### Test template
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_create_item():
    r = client.post("/api/v1/items/", json={"name": "test", "value": 42})
    assert r.status_code == 201
    assert r.json()["name"] == "test"

def test_get_item_not_found():
    r = client.get("/api/v1/items/99999")
    assert r.status_code == 404

def test_list_items():
    r = client.get("/api/v1/items/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_delete_item():
    # create then delete
    create = client.post("/api/v1/items/", json={"name": "to_delete"})
    item_id = create.json()["id"]
    r = client.delete(f"/api/v1/items/{item_id}")
    assert r.status_code == 204
```

---

## PLAYWRIGHT AUTOMATION PATTERNS

### Form filling
```python
await page.fill("input[name='email']", "test@example.com")
await page.fill("input[name='password']", "securepass")
await page.click("button[type='submit']")
await page.wait_for_url("**/dashboard")
```

### Scraping data from a page
```python
rows = await page.query_selector_all("table tbody tr")
data = []
for row in rows:
    cells = await row.query_selector_all("td")
    text = [await c.inner_text() for c in cells]
    data.append(text)
```

### Waiting for elements
```python
await page.wait_for_selector(".result", timeout=10000)
```

### Taking screenshots (for debugging)
```python
await page.screenshot(path="debug.png")
```

---

## ERROR HANDLING PLAYBOOK

| Error | Fix |
|-------|-----|
| ModuleNotFoundError | `pip install <module>` then add to requirements.txt |
| sqlalchemy.exc.OperationalError | Check DATABASE_URL in .env, check model matches schema |
| playwright._impl._errors.Error | Run `playwright install chromium` or add --with-deps to Dockerfile |
| docker build fails | Check requirements.txt for typos, check Python version |
| gcloud deploy fails | Read logs: `gcloud run logs read`, fix, redeploy |
| Test 422 Unprocessable Entity | Pydantic schema mismatch — check field types and required vs optional |
| Test 500 Internal Server Error | Check server logs: `uvicorn app.main:app --reload`, read traceback |
| CORS error | Already handled in main.py, check if origins list is correct |
| Port already in use | Kill it: `lsof -ti:8080 | xargs kill -9` |

When you hit ANY error:
1. Read the full traceback
2. Identify the root cause (don't guess)
3. Fix it
4. Run the failing test again
5. Only move on when it passes

---

## README TEMPLATE (fill after task is done)

```markdown
# GenHealth AI — Technical Assessment

## Live API
- **Base URL**: https://YOUR-CLOUD-RUN-URL.run.app
- **API Docs (Swagger)**: https://YOUR-CLOUD-RUN-URL.run.app/docs

## Tech Stack
- **Backend**: Python 3.11 + FastAPI
- **Database**: SQLite + SQLAlchemy 2.0
- **Automation**: Playwright (headless Chromium)
- **Deployment**: Docker + GCP Cloud Run
- **Testing**: pytest + httpx

## Architecture
[Short paragraph about how the system is structured]

## API Endpoints
| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| GET    | /health | Health check | 200 |
| ...    | ...     | ...          | ... |

## Design Decisions
- **SQLite over PostgreSQL**: Zero setup, ideal for a 4-hour window.
  Swap is a one-line .env change.
- **FastAPI**: Auto-generates OpenAPI docs, async-ready, Pydantic validation
  built in, fastest Python framework for this scope.
- **Playwright over Selenium**: Modern async API, auto-wait, faster execution,
  better Docker support.

## Running Locally
git clone https://github.com/gavksingh/genhealth.ai.git
cd genhealth.ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
uvicorn app.main:app --reload

## Running Tests
pytest tests/ -v

## Deployment
./deploy.sh

## What I Would Improve With More Time
- Add PostgreSQL for production persistence
- Add rate limiting and API key auth
- Add structured logging with request tracing
- Add CI/CD pipeline with GitHub Actions
- Add integration tests for the automation scripts
```

---

## FINAL CHECKLIST (run before submitting)

- [ ] ALL tests pass: `pytest tests/ -v`
- [ ] Live URL /health returns 200
- [ ] Live URL /docs loads Swagger UI
- [ ] All CRUD endpoints work against live URL (test with curl)
- [ ] Automation script completes successfully
- [ ] No secrets in git history (check: `git log --all --diff-filter=A -- "*.env" ".gcp-config"`)
- [ ] README has live URL, architecture, design decisions, local setup
- [ ] Code has docstrings on all endpoints
- [ ] All commits have meaningful messages
- [ ] .gitignore covers .env, .gcp-config, __pycache__, *.db, .venv