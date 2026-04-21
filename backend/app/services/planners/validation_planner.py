from __future__ import annotations

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


def plan_validation_prompt(
    request: PromptRequest,
) -> tuple[list[PromptPlanStep], list[str], list[str]]:
    prompt_text = request.prompt_text
    capabilities = {
        tool: capability_registry_service.get_capability(tool)
        for tool in (
            "test.run.gtest",
            "test.run.editor_python",
            "test.tiaf.sequence",
            "test.visual.diff",
        )
    }
    steps: list[PromptPlanStep] = []
    refusals: list[str] = []
    requirements: list[str] = []

    if contains_any(prompt_text, ["run gtest", "native test", "gtest target"]):
        capability = capabilities["test.run.gtest"]
        if capability is not None:
            targets = extract_quoted_values(prompt_text) or (
                [extract_value_after_phrase(prompt_text, "target ")]
                if extract_value_after_phrase(prompt_text, "target ")
                else []
            )
            targets = [target for target in targets if target]
            if targets:
                steps.append(
                    make_step(
                        step_id="validation-gtest-1",
                        capability=capability,
                        request=request,
                        args={"test_targets": targets},
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("test.run.gtest requires explicit test target names in the prompt.")

    if contains_any(prompt_text, ["run editor python test", "editor python module", "editor python validation"]):
        capability = capabilities["test.run.editor_python"]
        if capability is not None:
            modules = extract_quoted_values(prompt_text)
            if modules:
                steps.append(
                    make_step(
                        step_id="validation-editor-python-1",
                        capability=capability,
                        request=request,
                        args={"test_modules": modules},
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("test.run.editor_python requires one or more explicit test module names in the prompt.")

    if contains_any(prompt_text, ["run tiaf", "tiaf sequence", "test impact analysis"]):
        capability = capabilities["test.tiaf.sequence"]
        if capability is not None:
            sequence_name = extract_value_after_phrase(prompt_text, "sequence ")
            if not sequence_name:
                quoted_values = extract_quoted_values(prompt_text)
                sequence_name = quoted_values[0] if quoted_values else None
            if sequence_name:
                steps.append(
                    make_step(
                        step_id="validation-tiaf-1",
                        capability=capability,
                        request=request,
                        args={"sequence_name": sequence_name},
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("test.tiaf.sequence requires an explicit sequence name in the prompt.")

    if contains_any(prompt_text, ["visual diff", "compare screenshots", "image diff"]):
        capability = capabilities["test.visual.diff"]
        if capability is not None:
            artifact_ids = [value for value in extract_quoted_values(prompt_text) if value.startswith("art-")]
            if len(artifact_ids) >= 2:
                steps.append(
                    make_step(
                        step_id="validation-visual-diff-1",
                        capability=capability,
                        request=request,
                        args={
                            "baseline_artifact_id": artifact_ids[0],
                            "candidate_artifact_id": artifact_ids[1],
                            "threshold": 0.01,
                        },
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append(
                    "test.visual.diff requires explicit baseline and candidate artifact ids in the prompt."
                )

    return steps, refusals, requirements
