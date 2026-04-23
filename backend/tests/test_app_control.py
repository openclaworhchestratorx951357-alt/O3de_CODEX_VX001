from app.main import app
from fastapi.testclient import TestClient


def test_app_control_preview_builds_reversible_settings_and_navigation_script() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/app/control/preview",
            json={
                "instruction": "Make the app dark and compact, hide quick stats, then open Runtime.",
                "active_workspace_id": "home",
                "current_settings": {"appearance": {"themeMode": "light"}},
                "actor": {
                    "worker_id": "worker-o3de",
                    "display_name": "O3DE authoring specialist",
                    "agent_profile": "O3DE authoring specialist",
                },
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["approval_required"] is True
    assert payload["backup"]["required"] is True
    assert payload["backup"]["captures"] == ["settings profile", "active workspace", "acting agent identity"]
    assert payload["actor"]["worker_id"] == "worker-o3de"
    assert payload["actor"]["display_name"] == "O3DE authoring specialist"
    assert {operation["operation_id"] for operation in payload["operations"]} == {
        "set-theme-dark",
        "set-density-compact",
        "hide-desktop-telemetry",
        "open-workspace-runtime",
    }
    assert payload["operations"][-1]["kind"] == "navigation.open_workspace"
    assert payload["operations"][-1]["value"] == "runtime"
    assert "shell commands" in payload["warnings"][0]


def test_app_control_preview_blocks_shell_like_requests() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/app/control/preview",
            json={
                "instruction": "Run a PowerShell script and delete old files.",
                "active_workspace_id": "home",
                "current_settings": {},
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "no_supported_action"
    assert payload["risk_level"] == "medium"
    assert payload["operations"] == []
    assert "powershell" in payload["warnings"][0]
    assert "delete" in payload["warnings"][0]


def test_app_control_preview_routes_agent_profile_requests_to_builder_workspace() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/app/control/preview",
            json={
                "instruction": "Open the agent personality and memory workspace.",
                "active_workspace_id": "home",
                "current_settings": {},
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["operations"] == [
        {
            "operation_id": "open-workspace-builder",
            "kind": "navigation.open_workspace",
            "target": "activeWorkspaceId",
            "value": "builder",
            "description": "Open the builder workspace.",
            "reversible": True,
        }
    ]
