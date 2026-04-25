from __future__ import annotations

import re

from app.models.prompt_control import PromptRequest
from app.models.prompt_step import PromptPlanStep
from app.services.capability_registry import capability_registry_service
from app.services.planners._common import (
    capability_requirement_note,
    contains_any,
    extract_quoted_values,
    extract_value_after_phrase,
    make_step,
)


_SETTINGS_PATH_ALIASES = {
    "version": "/version",
    "project name": "/project_name",
    "display name": "/display_name",
    "summary": "/summary",
}


def _extract_settings_operation(prompt_text: str) -> dict[str, object] | None:
    lowered = prompt_text.lower()
    for phrase, registry_path in _SETTINGS_PATH_ALIASES.items():
        if phrase not in lowered:
            continue
        value = extract_value_after_phrase(prompt_text, "to ")
        if not value:
            quoted_values = extract_quoted_values(prompt_text)
            value = quoted_values[-1] if quoted_values else None
        if value:
            return {
                "registry_path": "/O3DE/Settings",
                "operations": [
                    {"op": "set", "path": registry_path, "value": value},
                ],
            }
    return None


def _extract_targets(prompt_text: str, marker: str) -> list[str]:
    quoted_values = extract_quoted_values(prompt_text)
    if quoted_values:
        return quoted_values
    candidate = extract_value_after_phrase(prompt_text, marker)
    if candidate is None:
        return []
    return [item.strip() for item in re.split(r"[, ]+", candidate) if item.strip()]


def plan_project_build_prompt(
    request: PromptRequest,
) -> tuple[list[PromptPlanStep], list[str], list[str]]:
    prompt_text = request.prompt_text
    capabilities = {
        tool: capability_registry_service.get_capability(tool)
        for tool in (
            "project.inspect",
            "settings.patch",
            "gem.enable",
            "build.configure",
            "build.compile",
        )
    }
    steps: list[PromptPlanStep] = []
    refusals: list[str] = []
    requirements: list[str] = []

    if contains_any(prompt_text, ["inspect project", "project manifest", "project config"]):
        capability = capabilities["project.inspect"]
        if capability is not None:
            steps.append(
                make_step(
                    step_id="project-inspect-1",
                    capability=capability,
                    request=request,
                    args={
                        "include_project_config": True,
                        "include_gems": True,
                        "include_settings": True,
                        "include_build_state": True,
                    },
                    planner_note="Prompt-driven project inspection defaults to the broad manifest-backed evidence set.",
                )
            )
            requirement = capability_requirement_note(capability)
            if requirement:
                requirements.append(requirement)

    if contains_any(prompt_text, ["configure build", "cmake configure", "refresh build tree"]):
        capability = capabilities["build.configure"]
        if capability is not None:
            args: dict[str, object] = {}
            preset = extract_value_after_phrase(prompt_text, "preset ")
            if preset:
                args["preset"] = preset
            config = extract_value_after_phrase(prompt_text, "config ")
            if config:
                args["config"] = config
            generator = extract_value_after_phrase(prompt_text, "generator ")
            if generator:
                args["generator"] = generator
            if "clean" in prompt_text.lower():
                args["clean"] = True
            steps.append(
                make_step(
                    step_id="build-configure-1",
                    capability=capability,
                    request=request,
                    args=args,
                )
            )
            requirement = capability_requirement_note(capability)
            if requirement:
                requirements.append(requirement)

    if contains_any(prompt_text, ["enable gem", "add gem"]):
        capability = capabilities["gem.enable"]
        if capability is not None:
            gem_name = extract_value_after_phrase(prompt_text, "enable gem ")
            if not gem_name:
                quoted_values = extract_quoted_values(prompt_text)
                gem_name = quoted_values[0] if quoted_values else None
            if gem_name:
                steps.append(
                    make_step(
                        step_id="gem-enable-1",
                        capability=capability,
                        request=request,
                        args={"gem_name": gem_name},
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("gem.enable requires an explicit gem name in the prompt.")

    if contains_any(prompt_text, ["compile", "build target", "compile target"]):
        capability = capabilities["build.compile"]
        if capability is not None:
            targets = _extract_targets(prompt_text, "target ")
            if targets:
                steps.append(
                    make_step(
                        step_id="build-compile-1",
                        capability=capability,
                        request=request,
                        args={"targets": targets},
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("build.compile requires one or more explicit target names in the prompt.")

    if contains_any(prompt_text, ["patch settings", "set version", "change project name", "update settings"]):
        capability = capabilities["settings.patch"]
        if capability is not None:
            operation_args = _extract_settings_operation(prompt_text)
            if operation_args is not None:
                steps.append(
                    make_step(
                        step_id="settings-patch-1",
                        capability=capability,
                        request=request,
                        args=operation_args,
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append(
                    "settings.patch currently admits only explicit manifest-backed set operations such as version or project name updates."
                )

    return steps, refusals, requirements
