from app.models.control_plane import LockRecord
from app.services.db import connection


class LocksService:
    def list_locks(self) -> list[LockRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM locks ORDER BY created_at ASC, name ASC"
            ).fetchall()
        return [LockRecord.model_validate(dict(row)) for row in rows]

    def get_conflicts(
        self,
        requested_locks: list[str],
        *,
        owner_run_id: str,
    ) -> list[LockRecord]:
        if not requested_locks:
            return []
        placeholders = ", ".join("?" for _ in requested_locks)
        with connection() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM locks
                WHERE name IN ({placeholders}) AND owner_run_id != ?
                ORDER BY created_at ASC, name ASC
                """,
                (*requested_locks, owner_run_id),
            ).fetchall()
        return [LockRecord.model_validate(dict(row)) for row in rows]

    def acquire(
        self,
        requested_locks: list[str],
        *,
        owner_run_id: str,
    ) -> list[LockRecord]:
        acquired: list[LockRecord] = []
        with connection() as conn:
            for lock_name in requested_locks:
                existing = conn.execute(
                    "SELECT * FROM locks WHERE name = ?",
                    (lock_name,),
                ).fetchone()
                if existing is None:
                    lock = LockRecord(name=lock_name, owner_run_id=owner_run_id)
                    conn.execute(
                        "INSERT INTO locks (name, owner_run_id, created_at) VALUES (?, ?, ?)",
                        (lock.name, lock.owner_run_id, lock.created_at.isoformat()),
                    )
                    acquired.append(lock)
                else:
                    acquired.append(LockRecord.model_validate(dict(existing)))
        return acquired

    def release(self, owner_run_id: str) -> None:
        with connection() as conn:
            conn.execute(
                "DELETE FROM locks WHERE owner_run_id = ?",
                (owner_run_id,),
            )


locks_service = LocksService()
