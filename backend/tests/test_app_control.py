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


def test_app_control_report_builds_verified_apply_receipt() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/app/control/report",
            json={
                "script_id": "app-control-test",
                "mode": "applied",
                "operations": [
                    {
                        "operation_id": "set-theme-dark",
                        "kind": "settings.patch",
                        "target": "appearance.themeMode",
                        "value": "dark",
                        "description": "Set the app theme mode to dark.",
                        "reversible": True,
                    },
                    {
                        "operation_id": "open-workspace-runtime",
                        "kind": "navigation.open_workspace",
                        "target": "activeWorkspaceId",
                        "value": "runtime",
                        "description": "Open the runtime workspace.",
                        "reversible": True,
                    },
                ],
                "settings_before": {
                    "appearance": {"themeMode": "system"},
                    "layout": {"preferredLandingSection": "home"},
                },
                "settings_after": {
                    "appearance": {"themeMode": "dark"},
                    "layout": {"preferredLandingSection": "home"},
                },
                "workspace_before": "home",
                "workspace_after": "runtime",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "applied"
    assert payload["generated_by"] == "deterministic-app-control-report-v1"
    assert payload["event_id"].startswith("evt-")
    assert payload["items"][0]["delta"] == "Theme mode: system -> dark"
    assert payload["items"][0]["verification"] == "verified"
    assert payload["items"][1]["delta"] == "Workspace: home -> runtime"
    assert payload["items"][1]["verification"] == "verified"

    with TestClient(app) as client:
        event_cards_response = client.get("/events/cards")

    assert event_cards_response.status_code == 200
    event_payload = event_cards_response.json()["events"][0]
    assert event_payload["event_type"] == "app_control_applied"
    assert event_payload["workspace_id"] == "runtime"
    assert event_payload["current_state"] == "verified"
    assert event_payload["capability_status"] == "reviewable_local"


def test_app_control_report_builds_revert_receipt_with_restore_deltas() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/app/control/report",
            json={
                "script_id": "app-control-test",
                "mode": "reverted",
                "operations": [],
                "settings_before": {
                    "appearance": {"themeMode": "dark", "density": "compact"},
                    "layout": {"guidedMode": True},
                },
                "settings_after": {
                    "appearance": {"themeMode": "system", "density": "comfortable"},
                    "layout": {"guidedMode": True},
                },
                "workspace_before": "runtime",
                "workspace_after": "home",
                "backup_settings": {
                    "appearance": {"themeMode": "system", "density": "comfortable"},
                    "layout": {"guidedMode": True},
                },
                "backup_workspace_id": "home",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "reverted"
    assert payload["event_id"].startswith("evt-")
    assert "Theme mode: dark -> system" in payload["items"][0]["delta"]
    assert "Density: compact -> comfortable" in payload["items"][0]["delta"]
    assert payload["items"][0]["verification"] == "verified"
    assert payload["items"][1]["delta"] == "Workspace: runtime -> home"
    assert payload["items"][1]["verification"] == "verified"
