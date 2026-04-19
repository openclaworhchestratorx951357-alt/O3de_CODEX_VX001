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
        )
        return control_plane_repository.create_artifact(artifact)

    def list_artifacts(self) -> list[ArtifactRecord]:
        return control_plane_repository.list_artifacts()

    def list_artifact_cards(self) -> ArtifactListResponse:
        return ArtifactListResponse(
            artifacts=[
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
        )

    def get_artifact(self, artifact_id: str) -> ArtifactRecord | None:
        return control_plane_repository.get_artifact(artifact_id)


artifacts_service = ArtifactsService()
