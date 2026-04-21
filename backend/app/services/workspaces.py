from app.models.control_plane import WorkspaceRecord
from app.repositories.control_plane import control_plane_repository


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


workspaces_service = WorkspacesService()
