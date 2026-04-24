from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.adapters import router as adapters_router
from app.api.routes.app_control import router as app_control_router
from app.api.routes.approvals import router as approvals_router
from app.api.routes.artifacts import router as artifacts_router
from app.api.routes.autonomy import router as autonomy_router
from app.api.routes.codex_control import router as codex_control_router
from app.api.routes.events import router as events_router
from app.api.routes.executions import router as executions_router
from app.api.routes.health import router as health_router
from app.api.routes.locks import router as locks_router
from app.api.routes.o3de_target import router as o3de_target_router
from app.api.routes.policies import router as policies_router
from app.api.routes.runs import router as runs_router
from app.api.routes.summary import router as summary_router
from app.api.routes.tools import router as tools_router
from app.api.routes.tools_catalog import router as tools_catalog_router
from app.models.api import RootStatus
from app.services.adapters import adapter_service
from app.services.db import initialize_database

try:
    from app.api.routes.executors import router as executors_router
except ModuleNotFoundError:
    executors_router = None

try:
    from app.api.routes.workspaces import router as workspaces_router
except ModuleNotFoundError:
    workspaces_router = None

try:
    from app.api.routes.prompt_control import router as prompt_control_router
except ModuleNotFoundError:
    prompt_control_router = None


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
    allow_origins=[
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(o3de_target_router)
app.include_router(adapters_router)
app.include_router(app_control_router)
app.include_router(summary_router)
app.include_router(tools_router)
app.include_router(tools_catalog_router)
app.include_router(runs_router)
app.include_router(approvals_router)
app.include_router(locks_router)
app.include_router(events_router)
app.include_router(policies_router)
app.include_router(executions_router)
app.include_router(artifacts_router)
app.include_router(autonomy_router)
app.include_router(codex_control_router)
if executors_router is not None:
    app.include_router(executors_router)
if workspaces_router is not None:
    app.include_router(workspaces_router)
if prompt_control_router is not None:
    app.include_router(prompt_control_router)


@app.get("/", response_model=RootStatus)
def root() -> RootStatus:
    adapter_status = adapter_service.get_runtime_status()
    routes = [
        "/health",
        "/ready",
        "/version",
        "/o3de/target",
        "/o3de/bridge",
        "/adapters",
        "/app/control/preview",
        "/app/control/report",
        "/summary",
        "/tools/catalog",
        "/tools/dispatch",
        "/runs",
        "/runs/cards",
        "/runs/summary",
        "/approvals",
        "/approvals/cards",
        "/locks",
        "/locks/cards",
        "/events",
        "/events/cards",
        "/events/summary",
        "/events/{event_id}",
        "/policies",
        "/executions",
        "/executions/cards",
        "/artifacts",
        "/artifacts/cards",
        "/autonomy",
        "/autonomy/objectives",
        "/autonomy/jobs",
        "/autonomy/observations",
        "/autonomy/healing-actions",
        "/autonomy/memories",
        "/codex/control",
        "/codex/control/lanes",
        "/codex/control/workers/sync",
        "/codex/control/workers/{worker_id}/heartbeat",
        "/codex/control/tasks",
        "/codex/control/tasks/{task_id}/claim",
        "/codex/control/tasks/{task_id}/release",
        "/codex/control/tasks/{task_id}/complete",
        "/codex/control/tasks/{task_id}/supersede",
        "/codex/control/tasks/{task_id}/wait",
        "/codex/control/workers/next-task",
        "/codex/control/workers/{worker_id}/notifications",
        "/codex/control/workers/{worker_id}/notifications/mark-read",
    ]
    if executors_router is not None:
        routes.append("/executors")
    if workspaces_router is not None:
        routes.append("/workspaces")
    if prompt_control_router is not None:
        routes.extend(["/prompt/capabilities", "/prompt/shortcuts", "/prompt/sessions"])
    return RootStatus(
        name="O3DE Agent Control Backend",
        status="phase-7-gem-state-refinement",
        execution_mode=adapter_status.active_mode,
        routes=routes,
        phase="phase-7",
    )
