import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import engine, Base
from app import models  # noqa: F401 — ensures tables are created
from app.routers import orders, logs
from app.middleware import ActivityLoggingMiddleware

# Auto-create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GenHealth AI Assessment API",
    description="Technical assessment for GenHealth AI — Full Stack Engineer",
    version="1.0.0",
)

# CORS — allow all origins for assessment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Activity logging middleware (added before CORS so it runs inside)
app.add_middleware(ActivityLoggingMiddleware)

# Register routers
app.include_router(orders.router)
app.include_router(logs.router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "genhealth-assessment", "version": "1.0.0"}


# Serve React frontend if build exists
_frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
_frontend_dir = os.path.abspath(_frontend_dir)

if os.path.isdir(_frontend_dir):
    # Mount Vite's hashed assets
    _assets_dir = os.path.join(_frontend_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the React SPA for any non-API route."""
        file_path = os.path.join(_frontend_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_frontend_dir, "index.html"))
