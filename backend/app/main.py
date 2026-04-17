from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.tools import router as tools_router

app = FastAPI(
    title="O3DE Agent Control Backend",
    version="0.1.0",
    description=(
        "Backend orchestration layer for O3DE-focused agents, approvals, locks, "
        "artifacts, and structured tool execution."
    ),
)

app.include_router(health_router)
app.include_router(tools_router)


@app.get("/")
def root() -> dict:
    return {
        "name": "O3DE Agent Control Backend",
        "status": "bootstrapped",
        "routes": ["/health", "/tools/dispatch"],
        "next": [
            "request validation",
            "tool dispatch",
            "approval checks",
            "lock enforcement",
        ],
    }
