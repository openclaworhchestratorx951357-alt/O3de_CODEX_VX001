from uuid import uuid4

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

    def get_artifact(self, artifact_id: str) -> ArtifactRecord | None:
        return control_plane_repository.get_artifact(artifact_id)


artifacts_service = ArtifactsService()
