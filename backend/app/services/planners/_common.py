from __future__ import annotations

import re
from typing import Iterable

from app.models.prompt_control import PromptCapabilityEntry, PromptRequest
from app.models.prompt_step import PromptPlanStep


_QUOTED_VALUE_PATTERN = re.compile(r"""["']([^"']+)["']""")
_FLOAT_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")


def normalize_prompt_text(prompt_text: str) -> str:
    return prompt_text.lower().strip()


def contains_any(prompt_text: str, aliases: Iterable[str]) -> bool:
    normalized = normalize_prompt_text(prompt_text)
    return any(alias in normalized for alias in aliases)


def extract_quoted_values(prompt_text: str) -> list[str]:
    return [match.strip() for match in _QUOTED_VALUE_PATTERN.findall(prompt_text) if match.strip()]


def extract_first_path_like_value(prompt_text: str) -> str | None:
    quoted_values = extract_quoted_values(prompt_text)
    for value in quoted_values:
        if "/" in value or "\\" in value or "." in value:
            return value
    return None


def extract_value_after_phrase(prompt_text: str, phrase: str) -> str | None:
    normalized = prompt_text
    marker = phrase.lower()
    lower = normalized.lower()
    index = lower.find(marker)
    if index < 0:
        return None
    tail = normalized[index + len(marker):].strip(" :,-")
    if not tail:
        return None
    quoted_values = extract_quoted_values(tail)
    if quoted_values:
        return quoted_values[0]
    token = re.split(r"[,.;\n]", tail, maxsplit=1)[0].strip()
    return token or None


def extract_named_entity(prompt_text: str, fallback: str) -> str:
    for phrase in ("named ", "called "):
        candidate = extract_value_after_phrase(prompt_text, phrase)
        if candidate:
            return candidate
    quoted_values = extract_quoted_values(prompt_text)
    if quoted_values:
        return quoted_values[0]
    return fallback


def extract_position(prompt_text: str) -> dict[str, float] | None:
    lowered = normalize_prompt_text(prompt_text)
    index = lowered.find(" at ")
    if index < 0:
        return None
    tail = prompt_text[index + 4:]
    numbers = _FLOAT_PATTERN.findall(tail)
    if len(numbers) < 3:
        return None
    return {
        "x": float(numbers[0]),
        "y": float(numbers[1]),
        "z": float(numbers[2]),
    }


def capability_requirement_note(capability: PromptCapabilityEntry) -> str | None:
    if capability.safety_envelope.natural_language_blocker:
        return capability.safety_envelope.natural_language_blocker
    if capability.capability_maturity == "real-authoring":
        return (
            f"{capability.tool_name} currently resolves through an admitted real-authoring "
            "path when editor-runtime prechecks are satisfied; unsupported mutation "
            "surfaces remain explicitly non-admitted."
        )
    if capability.capability_maturity == "simulated-only":
        return (
            f"{capability.tool_name} currently resolves only through the explicitly labeled "
            "simulated control-plane path."
        )
    if capability.capability_maturity == "plan-only":
        return (
            f"{capability.tool_name} currently resolves through a plan-only or preflight path; "
            "real mutation is not admitted from this planner step."
        )
    if capability.capability_maturity == "hybrid-read-only":
        return (
            f"{capability.tool_name} prefers the admitted real read-only path when its preconditions "
            "are satisfied and otherwise stays explicitly labeled."
        )
    if capability.capability_maturity == "hybrid-mutation":
        return (
            f"{capability.tool_name} remains mutation-gated and executes only within the admitted "
            "backup/rollback boundary."
        )
    return None


def make_step(
    *,
    step_id: str,
    capability: PromptCapabilityEntry,
    request: PromptRequest,
    args: dict[str, object],
    depends_on: list[str] | None = None,
    planner_note: str | None = None,
) -> PromptPlanStep:
    return PromptPlanStep(
        step_id=step_id,
        tool=capability.tool_name,
        agent=capability.agent_family,
        args=args,
        approval_class=capability.approval_class,
        required_locks=capability.default_locks,
        capability_status_required=capability.capability_status,
        workspace_id=request.workspace_id,
        executor_id=request.executor_id,
        simulated_allowed=(
            capability.capability_maturity == "simulated-only"
            or not capability.real_adapter_availability
        ),
        depends_on=depends_on or [],
        capability_maturity=capability.capability_maturity,
        safety_envelope=capability.safety_envelope,
        planner_note=planner_note,
    )
