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


def plan_asset_pipeline_prompt(
    request: PromptRequest,
) -> tuple[list[PromptPlanStep], list[str], list[str]]:
    prompt_text = request.prompt_text
    capabilities = {
        tool: capability_registry_service.get_capability(tool)
        for tool in (
            "asset.processor.status",
            "asset.source.inspect",
            "asset.batch.process",
            "asset.move.safe",
        )
    }
    steps: list[PromptPlanStep] = []
    refusals: list[str] = []
    requirements: list[str] = []

    if contains_any(prompt_text, ["asset processor status", "asset processor"]):
        capability = capabilities["asset.processor.status"]
        if capability is not None:
            steps.append(
                make_step(
                    step_id="asset-processor-1",
                    capability=capability,
                    request=request,
                    args={"include_jobs": True, "include_platforms": True},
                )
            )
            requirement = capability_requirement_note(capability)
            if requirement:
                requirements.append(requirement)

    if contains_any(prompt_text, ["inspect asset", "source asset", "asset metadata"]):
        capability = capabilities["asset.source.inspect"]
        if capability is not None:
            source_path = extract_first_path_like_value(prompt_text)
            if source_path:
                steps.append(
                    make_step(
                        step_id="asset-inspect-1",
                        capability=capability,
                        request=request,
                        args={
                            "source_path": source_path,
                            "include_products": True,
                            "include_dependencies": True,
                        },
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("asset.source.inspect requires an explicit source asset path in the prompt.")

    if contains_any(prompt_text, ["process assets", "asset batch", "asset pipeline batch"]):
        capability = capabilities["asset.batch.process"]
        if capability is not None:
            source_glob = extract_value_after_phrase(prompt_text, "glob ")
            args: dict[str, object] = {}
            if source_glob:
                args["source_glob"] = source_glob
            steps.append(
                make_step(
                    step_id="asset-batch-1",
                    capability=capability,
                    request=request,
                    args=args,
                )
            )
            requirement = capability_requirement_note(capability)
            if requirement:
                requirements.append(requirement)

    if contains_any(prompt_text, ["move asset", "rename asset", "relocate asset"]):
        capability = capabilities["asset.move.safe"]
        if capability is not None:
            quoted_values = extract_quoted_values(prompt_text)
            source_path = quoted_values[0] if len(quoted_values) >= 1 else extract_first_path_like_value(prompt_text)
            destination_path = quoted_values[1] if len(quoted_values) >= 2 else extract_value_after_phrase(
                prompt_text,
                " to ",
            )
            if source_path and destination_path:
                steps.append(
                    make_step(
                        step_id="asset-move-1",
                        capability=capability,
                        request=request,
                        args={
                            "source_path": source_path,
                            "destination_path": destination_path,
                            "update_references": True,
                            "dry_run_plan": request.dry_run,
                        },
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("asset.move.safe requires explicit source and destination paths in the prompt.")

    return steps, refusals, requirements
