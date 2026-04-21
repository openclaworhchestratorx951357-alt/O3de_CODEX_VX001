from __future__ import annotations

from app.models.prompt_control import PromptRequest
from app.models.prompt_step import PromptPlanStep
from app.services.capability_registry import capability_registry_service
from app.services.planners._common import (
    capability_requirement_note,
    contains_any,
    extract_first_path_like_value,
    extract_quoted_values,
    extract_value_after_phrase,
    make_step,
)


def plan_render_lookdev_prompt(
    request: PromptRequest,
) -> tuple[list[PromptPlanStep], list[str], list[str]]:
    prompt_text = request.prompt_text
    capabilities = {
        tool: capability_registry_service.get_capability(tool)
        for tool in (
            "render.capture.viewport",
            "render.material.inspect",
            "render.material.patch",
            "render.shader.rebuild",
        )
    }
    steps: list[PromptPlanStep] = []
    refusals: list[str] = []
    requirements: list[str] = []

    if contains_any(prompt_text, ["capture viewport", "viewport screenshot", "take screenshot"]):
        capability = capabilities["render.capture.viewport"]
        if capability is not None:
            steps.append(
                make_step(
                    step_id="render-capture-1",
                    capability=capability,
                    request=request,
                    args={
                        "output_label": "prompt-capture",
                        "resolution": {"width": 1920, "height": 1080},
                    },
                )
            )
            requirement = capability_requirement_note(capability)
            if requirement:
                requirements.append(requirement)

    if contains_any(prompt_text, ["inspect material", "show material", "material details"]):
        capability = capabilities["render.material.inspect"]
        if capability is not None:
            material_path = extract_first_path_like_value(prompt_text)
            if material_path:
                steps.append(
                    make_step(
                        step_id="render-material-inspect-1",
                        capability=capability,
                        request=request,
                        args={
                            "material_path": material_path,
                            "include_shader_data": True,
                            "include_references": True,
                        },
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("render.material.inspect requires an explicit material path in the prompt.")

    if contains_any(prompt_text, ["patch material", "set material", "update material property"]):
        capability = capabilities["render.material.patch"]
        if capability is not None:
            material_path = extract_first_path_like_value(prompt_text)
            override_value = extract_value_after_phrase(prompt_text, "to ")
            lowered = prompt_text.lower()
            override_key = None
            for candidate in ("roughness", "metallic", "basecolor", "base color", "opacity"):
                if candidate in lowered:
                    override_key = candidate.replace(" ", "_")
                    break
            if material_path and override_key and override_value:
                steps.append(
                    make_step(
                        step_id="render-material-patch-1",
                        capability=capability,
                        request=request,
                        args={
                            "material_path": material_path,
                            "property_overrides": {override_key: override_value},
                            "create_backup": True,
                        },
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append(
                    "render.material.patch requires an explicit material path plus a typed property/value override in the prompt."
                )

    if contains_any(prompt_text, ["rebuild shader", "recompile shader"]):
        capability = capabilities["render.shader.rebuild"]
        if capability is not None:
            shader_targets = extract_quoted_values(prompt_text)
            args: dict[str, object] = {}
            if shader_targets:
                args["shader_targets"] = shader_targets
            steps.append(
                make_step(
                    step_id="render-shader-1",
                    capability=capability,
                    request=request,
                    args=args,
                )
            )
            requirement = capability_requirement_note(capability)
            if requirement:
                requirements.append(requirement)

    return steps, refusals, requirements
