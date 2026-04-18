from app.models.control_plane import LockRecord
from app.repositories.control_plane import control_plane_repository


class LocksService:
    def list_locks(self) -> list[LockRecord]:
        return control_plane_repository.list_locks()

    def get_conflicts(
        self,
        requested_locks: list[str],
        *,
        owner_run_id: str,
    ) -> list[LockRecord]:
        return control_plane_repository.get_lock_conflicts(
            requested_locks,
            owner_run_id=owner_run_id,
        )

    def acquire(
        self,
        requested_locks: list[str],
        *,
        owner_run_id: str,
    ) -> list[LockRecord]:
        return control_plane_repository.acquire_locks(
            requested_locks,
            owner_run_id=owner_run_id,
        )

    def release(self, owner_run_id: str) -> None:
        control_plane_repository.release_locks(owner_run_id)


locks_service = LocksService()
