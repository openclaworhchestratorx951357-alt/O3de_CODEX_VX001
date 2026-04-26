from pydantic import BaseModel, Field


class PromptSafetyEnvelope(BaseModel):
    state_scope: str = Field(..., min_length=1)
    backup_class: str = Field(..., min_length=1)
    rollback_class: str = Field(..., min_length=1)
    verification_class: str = Field(..., min_length=1)
    retention_class: str = Field(..., min_length=1)
    natural_language_status: str = Field(..., min_length=1)
    natural_language_blocker: str | None = None
    mutation_surface_class: str = Field(default="not-mutating", min_length=1)
    restore_boundary_class: str = Field(default="not-applicable", min_length=1)
    candidate_expansion_boundary: str | None = None


def default_prompt_safety_envelope() -> PromptSafetyEnvelope:
    return PromptSafetyEnvelope(
        state_scope="Typed control-plane surface with explicitly bounded state scope.",
        backup_class="unspecified",
        rollback_class="unspecified",
        verification_class="unspecified",
        retention_class="operator-summary-evidence",
        natural_language_status="prompt-ready-simulated",
        natural_language_blocker=None,
        mutation_surface_class="unspecified",
        restore_boundary_class="unspecified",
        candidate_expansion_boundary=None,
    )
