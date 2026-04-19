from typing import Any
from uuid import uuid4

from app.models.api import ArtifactListItem, ArtifactListResponse
from app.models.control_plane import ArtifactRecord
from app.repositories.control_plane import control_plane_repository


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
                    inspection_surface=self._read_string_metadata(
                        artifact.metadata,
                        "inspection_surface",
                    ),
                    execution_mode=self._read_string_metadata(
                        artifact.metadata,
                        "execution_mode",
                    ),
                    project_name=self._read_string_metadata(
                        artifact.metadata,
                        "project_name",
                    ),
                    mutation_audit_status=self._mutation_audit_string(
                        artifact.metadata,
                        "status",
                    ),
                    mutation_audit_summary=self._mutation_audit_string(
                        artifact.metadata,
                        "summary",
                    ),
                )
                for artifact in self.list_artifacts()
            ]
        )

    def get_artifact(self, artifact_id: str) -> ArtifactRecord | None:
        return control_plane_repository.get_artifact(artifact_id)

    def _read_string_metadata(
        self,
        metadata: dict[str, object] | None,
        key: str,
    ) -> str | None:
        if not isinstance(metadata, dict):
            return None
        value = metadata.get(key)
        return value.strip() if isinstance(value, str) and value.strip() else None

    def _mutation_audit_string(
        self,
        metadata: dict[str, Any] | None,
        key: str,
    ) -> str | None:
        if not isinstance(metadata, dict):
            return None
        mutation_audit = metadata.get("mutation_audit")
        if not isinstance(mutation_audit, dict):
            return None
        value = mutation_audit.get(key)
        return value.strip() if isinstance(value, str) and value.strip() else None


artifacts_service = ArtifactsService()
