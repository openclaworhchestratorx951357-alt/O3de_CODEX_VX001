from typing import Any

from app.models.api import WorkspaceStatusProjection
from app.models.control_plane import WorkspaceRecord
from app.repositories.control_plane import control_plane_repository

_WORKSPACE_STATUS_TRUTH_NOTE = (
    "Workspace state is substrate truth only; execution completion and tool "
    "admission must be confirmed separately."
)


def _binding_label(binding: dict[str, Any], preferred_keys: tuple[str, ...]) -> str | None:
    for key in preferred_keys:
        value = binding.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def _retention_label(workspace: WorkspaceRecord) -> str:
    workspace_state = workspace.workspace_state.lower()
    retention_class = workspace.retention_class.lower()
    cleanup_policy = workspace.cleanup_policy.lower()
    retention_truth = f"{retention_class} {cleanup_policy}"

    if workspace_state == "cleaned":
        return "cleaned"
    if workspace_state == "cleanup_pending" or "cleanup-pending" in retention_truth:
        return "cleanup-pending"
    if "rollback" in retention_truth:
        return "retained-for-rollback"
    if any(token in retention_truth for token in ("evidence", "retained", "operator")):
        return "retained-for-evidence"
    if retention_class == "ephemeral" or "delete" in cleanup_policy:
        return "ephemeral"
    return workspace.retention_class


def _workspace_updated_at(workspace: WorkspaceRecord) -> str:
    updated_at = (
        workspace.cleaned_at
        or workspace.completed_at
        or workspace.activated_at
        or workspace.created_at
    )
    return updated_at.isoformat()


class WorkspacesService:
    def list_workspaces(self) -> list[WorkspaceRecord]:
        return control_plane_repository.list_workspaces()

    def get_workspace(self, workspace_id: str) -> WorkspaceRecord | None:
        return control_plane_repository.get_workspace(workspace_id)

    def upsert_workspace(self, workspace: WorkspaceRecord) -> WorkspaceRecord:
        existing = control_plane_repository.get_workspace(workspace.id)
        if existing is None:
            return control_plane_repository.create_workspace(workspace)

        existing.workspace_kind = workspace.workspace_kind
        existing.workspace_root = workspace.workspace_root
        existing.workspace_state = workspace.workspace_state
        existing.cleanup_policy = workspace.cleanup_policy
        existing.retention_class = workspace.retention_class
        existing.engine_binding = workspace.engine_binding
        existing.project_binding = workspace.project_binding
        existing.runner_family = workspace.runner_family
        existing.owner_run_id = workspace.owner_run_id
        existing.owner_execution_id = workspace.owner_execution_id
        existing.owner_executor_id = workspace.owner_executor_id
        existing.activated_at = workspace.activated_at
        existing.completed_at = workspace.completed_at
        existing.cleaned_at = workspace.cleaned_at
        existing.last_failure_summary = workspace.last_failure_summary
        return control_plane_repository.update_workspace(existing)

    def list_workspace_statuses(self) -> list[WorkspaceStatusProjection]:
        return [
            WorkspaceStatusProjection(
                workspace_id=workspace.id,
                workspace_kind=workspace.workspace_kind,
                workspace_state=workspace.workspace_state,
                engine_binding_label=_binding_label(
                    workspace.engine_binding,
                    ("engine_root", "engine_id", "label", "source_label"),
                ),
                project_binding_label=_binding_label(
                    workspace.project_binding,
                    ("project_root", "project_id", "label", "source_label"),
                ),
                runner_family=workspace.runner_family,
                owner_run_id=workspace.owner_run_id,
                owner_execution_id=workspace.owner_execution_id,
                owner_executor_id=workspace.owner_executor_id,
                created_at=workspace.created_at.isoformat(),
                updated_at=_workspace_updated_at(workspace),
                cleanup_policy=workspace.cleanup_policy,
                retention_label=_retention_label(workspace),
                last_failure_summary=workspace.last_failure_summary,
                truth_note=_WORKSPACE_STATUS_TRUTH_NOTE,
            )
            for workspace in self.list_workspaces()
        ]


workspaces_service = WorkspacesService()
