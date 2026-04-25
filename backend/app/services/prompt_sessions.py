from datetime import datetime, timezone

from app.models.prompt_control import PromptSessionRecord
from app.repositories.control_plane import control_plane_repository


class PromptSessionsService:
    def list_sessions(self) -> list[PromptSessionRecord]:
        return control_plane_repository.list_prompt_sessions()

    def get_session(self, prompt_id: str) -> PromptSessionRecord | None:
        return control_plane_repository.get_prompt_session(prompt_id)

    def create_session(self, session: PromptSessionRecord) -> PromptSessionRecord:
        return control_plane_repository.create_prompt_session(session)

    def update_session(self, session: PromptSessionRecord) -> PromptSessionRecord:
        session.updated_at = datetime.now(timezone.utc)
        return control_plane_repository.update_prompt_session(session)


prompt_sessions_service = PromptSessionsService()
