from fastapi import FastAPI

app = FastAPI(
    title="O3DE Agent Control Backend",
    version="0.1.0",
    description=(
        "Backend orchestration layer for O3DE-focused agents, approvals, locks, "
        "artifacts, and structured tool execution."
    ),
)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "backend", "version": "0.1.0"}


@app.get("/")
def root() -> dict:
    return {
        "name": "O3DE Agent Control Backend",
        "status": "bootstrapped",
        "next": [
            "request validation",
            "tool dispatch",
            "approval checks",
            "lock enforcement",
        ],
    }
