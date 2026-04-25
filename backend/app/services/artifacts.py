from uuid import uuid4

from app.models.api import ArtifactListItem, ArtifactListResponse
from app.models.control_plane import ArtifactRecord
from app.repositories.control_plane import control_plane_repository
from app.services.card_utils import (
    read_nested_string_value,
    read_string_value,
)


class ArtifactsService:
    def create_artifact(
        self,
        *,
        run_id: str,
        execution_id: str,
        label: str,
        kind: str,
        uri: str,
        path: str | None = None,
        content_type: str | None = None,
        simulated: bool = True,
        metadata: dict[str, object] | None = None,
        artifact_role: str | None = None,
        executor_id: str | None = None,
        workspace_id: str | None = None,
        retention_class: str | None = None,
        evidence_completeness: str | None = None,
    ) -> ArtifactRecord:
        artifact = ArtifactRecord(
            id=f"art-{uuid4().hex[:12]}",
            run_id=run_id,
            execution_id=execution_id,
            label=label,
            kind=kind,
            uri=uri,
            path=path,
            content_type=content_type,
            simulated=simulated,
            metadata=metadata or {},
            artifact_role=artifact_role,
            executor_id=executor_id,
            workspace_id=workspace_id,
            retention_class=retention_class,
            evidence_completeness=evidence_completeness,
        )
        return control_plane_repository.create_artifact(artifact)

    def list_artifacts(self) -> list[ArtifactRecord]:
        return control_plane_repository.list_artifacts()

    def list_artifact_cards(
        self,
        *,
        requested_inspection_surface: str | None = None,
        requested_fallback_category: str | None = None,
        requested_manifest_source_of_truth: str | None = None,
    ) -> ArtifactListResponse:
        artifact_cards = [
            ArtifactListItem(
                id=artifact.id,
                run_id=artifact.run_id,
                execution_id=artifact.execution_id,
                label=artifact.label,
                kind=artifact.kind,
                uri=artifact.uri,
                path=artifact.path,
                content_type=artifact.content_type,
                simulated=artifact.simulated,
                created_at=artifact.created_at.isoformat(),
                inspection_surface=read_string_value(artifact.metadata, "inspection_surface"),
                fallback_category=read_string_value(artifact.metadata, "fallback_category"),
                project_manifest_source_of_truth=read_string_value(
                    artifact.metadata,
                    "project_manifest_source_of_truth",
                ),
                artifact_role=artifact.artifact_role,
                executor_id=artifact.executor_id,
                workspace_id=artifact.workspace_id,
                retention_class=artifact.retention_class,
                evidence_completeness=artifact.evidence_completeness,
                execution_mode=read_string_value(artifact.metadata, "execution_mode"),
                project_name=read_string_value(artifact.metadata, "project_name"),
                mutation_audit_status=read_nested_string_value(
                    artifact.metadata,
                    "mutation_audit",
                    "status",
                ),
                mutation_audit_summary=read_nested_string_value(
                    artifact.metadata,
                    "mutation_audit",
                    "summary",
                ),
            )
            for artifact in self.list_artifacts()
        ]
        return ArtifactListResponse(
            artifacts=[
                card
                for card in artifact_cards
                if self._matches_card_filters(
                    card=card,
                    requested_inspection_surface=requested_inspection_surface,
                    requested_fallback_category=requested_fallback_category,
                    requested_manifest_source_of_truth=requested_manifest_source_of_truth,
                )
            ]
        )

    def _matches_card_filters(
        self,
        *,
        card: ArtifactListItem,
        requested_inspection_surface: str | None,
        requested_fallback_category: str | None,
        requested_manifest_source_of_truth: str | None,
    ) -> bool:
        if (
            requested_inspection_surface
            and card.inspection_surface != requested_inspection_surface
        ):
            return False
        if (
            requested_fallback_category
            and card.fallback_category != requested_fallback_category
        ):
            return False
        if (
            requested_manifest_source_of_truth
            and card.project_manifest_source_of_truth != requested_manifest_source_of_truth
        ):
            return False
        return True

    def get_artifact(self, artifact_id: str) -> ArtifactRecord | None:
        return control_plane_repository.get_artifact(artifact_id)


artifacts_service = ArtifactsService()
