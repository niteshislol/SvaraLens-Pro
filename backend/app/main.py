import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from .config import settings
from .db import engine, Base, ensure_schema
from .routers import cases, runs, findings, reviews, capsules, exports, health, auth, audit, access_requests

# Validate configuration at module load / startup (fails closed on security misconfigurations)
settings.validate_configuration()

# Create DB tables & ensure schema migrations
Base.metadata.create_all(bind=engine)
ensure_schema(engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.TAGLINE,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# SEC-04: Fail-closed CORS configuration. Wildcard '*' is strictly prohibited with credentials.
if "*" in settings.CORS_ORIGINS and settings.ALLOW_CREDENTIALS:
    raise ValueError("CORS configuration invalid: wildcard origin '*' is prohibited when allow_credentials=True.")

# Default safe explicit localhost origins if unset in development
resolved_origins = list(settings.CORS_ORIGINS) if settings.CORS_ORIGINS else [
    "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"
]
render_url = os.getenv("RENDER_EXTERNAL_URL")
if render_url and render_url not in resolved_origins:
    resolved_origins.append(render_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=resolved_origins,
    allow_credentials=settings.ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Custom error formatting: {error: {code, message, detail}}
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "detail": str(exc.detail)
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": 422,
                "message": "Validation Error",
                "detail": exc.errors()
            }
        }
    )

# Include routers under /api
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)
app.include_router(cases.router, prefix=settings.API_PREFIX)
app.include_router(runs.router, prefix=settings.API_PREFIX)
app.include_router(findings.router, prefix=settings.API_PREFIX)
app.include_router(reviews.router, prefix=settings.API_PREFIX)
app.include_router(capsules.router, prefix=settings.API_PREFIX)
app.include_router(exports.router, prefix=settings.API_PREFIX)
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(access_requests.router, prefix=settings.API_PREFIX)
# Also root /health
app.include_router(health.router)

# Mount distribution paths
LANDING_DIST = settings.BASE_DIR / "landing" / "dist"
FRONTEND_DIST = settings.BASE_DIR / "frontend" / "dist"

# Mount Workbench assets at /app/assets
if (FRONTEND_DIST / "assets").exists():
    app.mount("/app/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="workbench-assets")

# Mount Landing assets at /assets, /brand, /images
if LANDING_DIST.exists():
    if (LANDING_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(LANDING_DIST / "assets")), name="landing-assets")
    if (LANDING_DIST / "brand").exists():
        app.mount("/brand", StaticFiles(directory=str(LANDING_DIST / "brand")), name="landing-brand")
    if (LANDING_DIST / "images").exists():
        app.mount("/images", StaticFiles(directory=str(LANDING_DIST / "images")), name="landing-images")
elif (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")


# Serve Workbench at /app and /app/*
@app.get("/app")
@app.get("/app/{full_path:path}")
async def serve_workbench(full_path: str = ""):
    workbench_index = FRONTEND_DIST / "index.html"
    if workbench_index.exists():
        return FileResponse(str(workbench_index))
    return JSONResponse(status_code=404, content={"error": {"code": 404, "message": "Workbench frontend not built"}})


# Serve Root / Landing Page & marketing assets
@app.get("/{full_path:path}")
async def serve_root_or_landing(full_path: str = ""):
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"error": {"code": 404, "message": "Not Found"}})

    # Static assets directly under root
    if full_path in ("robots.txt", "sitemap.xml") and (LANDING_DIST / full_path).exists():
        return FileResponse(str(LANDING_DIST / full_path))
    if full_path == "vite.svg" and (FRONTEND_DIST / "vite.svg").exists():
        return FileResponse(str(FRONTEND_DIST / "vite.svg"))
    if full_path in ("favicon.ico", "favicon.svg") and (LANDING_DIST / "brand" / "favicon.svg").exists():
        return FileResponse(str(LANDING_DIST / "brand" / "favicon.svg"), media_type="image/svg+xml")

    # Serve landing page SPA
    landing_index = LANDING_DIST / "index.html"
    if landing_index.exists():
        return FileResponse(str(landing_index))

    # Fallback to workbench SPA if landing page not yet built
    workbench_index = FRONTEND_DIST / "index.html"
    if workbench_index.exists():
        return FileResponse(str(workbench_index))

    return {
        "project": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "status": "online",
        "models": {
            "tts": settings.TIMBRE_MODEL,
            "asr": settings.PRISMA_MODEL
        },
        "mock_mode": settings.MOCK_MODE or not bool(settings.GNANI_API_KEY)
    }
