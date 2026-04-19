from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.adapters import router as adapters_router
from app.api.routes.approvals import router as approvals_router
from app.api.routes.artifacts import router as artifacts_router
from app.api.routes.events import router as events_router
from app.api.routes.executions import router as executions_router
from app.api.routes.health import router as health_router
from app.api.routes.locks import router as locks_router
from app.api.routes.policies import router as policies_router
from app.api.routes.runs import router as runs_router
from app.api.routes.tools import router as tools_router
from app.api.routes.tools_catalog import router as tools_catalog_router
from app.models.api import RootStatus
from app.services.adapters import adapter_service
from app.services.db import initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database(raise_on_failure=False)
    yield

app = FastAPI(
    title="O3DE Agent Control Backend",
    version="0.3.1",
    description=(
        "Backend orchestration layer for O3DE-focused agents, approvals, locks, "
        "artifacts, and structured tool execution."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(adapters_router)
app.include_router(tools_router)
app.include_router(tools_catalog_router)
app.include_router(runs_router)
app.include_router(approvals_router)
app.include_router(locks_router)
app.include_router(events_router)
app.include_router(policies_router)
app.include_router(executions_router)
app.include_router(artifacts_router)


@app.get("/", response_model=RootStatus)
def root() -> RootStatus:
    adapter_status = adapter_service.get_runtime_status()
    return RootStatus(
        name="O3DE Agent Control Backend",
        status="phase-7-gem-state-refinement",
        execution_mode=adapter_status.active_mode,
        routes=[
            "/health",
            "/ready",
            "/version",
            "/adapters",
            "/tools/catalog",
            "/tools/dispatch",
            "/runs",
            "/runs/summary",
            "/approvals",
            "/locks",
            "/events",
            "/policies",
            "/executions",
            "/artifacts",
        ],
        phase="phase-7",
    )
