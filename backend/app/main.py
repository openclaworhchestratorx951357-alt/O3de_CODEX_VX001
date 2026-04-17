from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.tools import router as tools_router
from app.api.routes.tools_catalog import router as tools_catalog_router

app = FastAPI(
    title="O3DE Agent Control Backend",
    version="0.1.0",
    description=(
        "Backend orchestration layer for O3DE-focused agents, approvals, locks, "
        "artifacts, and structured tool execution."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(tools_router)
app.include_router(tools_catalog_router)


@app.get("/")
def root() -> dict:
    return {
        "name": "O3DE Agent Control Backend",
        "status": "bootstrapped",
        "routes": ["/health", "/tools/dispatch", "/tools/catalog"],
        "next": [
            "request validation",
            "tool dispatch",
            "approval checks",
            "lock enforcement",
        ],
    }
