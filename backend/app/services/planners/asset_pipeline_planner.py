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

ASSET_PROCESSOR_EXECUTION_REFUSAL = "asset.processor.execution.unsupported"
ASSET_CACHE_MUTATION_REFUSAL = "asset.cache.mutation.unsupported"
ASSET_PRODUCT_RESOLVE_REFUSAL = "asset.product.resolve.unsupported"
ASSET_SOURCE_MUTATION_REFUSAL = "asset.source.mutation.unsupported"
_ASSET_READBACK_SAFE_ALTERNATIVE = (
    "I can inspect an explicit source asset and read any existing "
    "product/dependency evidence from the project-local Asset Processor "
    "database, but I cannot run Asset Processor or mutate cache, source, or "
    "product files."
)


def _contains_asset_processor_execution_intent(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    if "asset processor" not in normalized and "assetprocessorbatch" not in normalized:
        return False
    execution_markers = (
        "run ",
        "start ",
        "launch ",
        "execute ",
        "process ",
        "generate ",
        "build ",
        "rebuild ",
        "refresh ",
    )
    return any(marker in normalized for marker in execution_markers)


def _contains_asset_cache_mutation_intent(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    cache_markers = (
        "asset database",
        "assetdb.sqlite",
        "asset db",
        "cache",
    )
    mutation_markers = (
        "fix ",
        "update ",
        "edit ",
        "change ",
        "write ",
        "repair ",
        "delete ",
        "clean ",
        "clear ",
        "regenerate ",
    )
    return any(marker in normalized for marker in cache_markers) and any(
        marker in normalized for marker in mutation_markers
    )


def _contains_broad_product_resolve_intent(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    if "resolve" not in normalized:
        return False
    broad_markers = ("every ", "all ", "whole ", "entire ", "catalog")
    product_markers = ("product", "dependency", "asset catalog")
    return any(marker in normalized for marker in broad_markers) and any(
        marker in normalized for marker in product_markers
    )


def _contains_asset_source_mutation_intent(prompt_text: str) -> bool:
    normalized = prompt_text.lower()
    if "source asset" not in normalized and "asset file" not in normalized:
        return False
    mutation_markers = (
        "change ",
        "modify ",
        "edit ",
        "rewrite ",
        "repair ",
        "fix ",
        "update ",
    )
    return any(marker in normalized for marker in mutation_markers)


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

    if _contains_asset_processor_execution_intent(prompt_text):
        return (
            [],
            [ASSET_PROCESSOR_EXECUTION_REFUSAL],
            [
                "Asset Processor and AssetProcessorBatch execution are not admitted from Prompt Studio.",
                _ASSET_READBACK_SAFE_ALTERNATIVE,
            ],
        )

    if _contains_asset_cache_mutation_intent(prompt_text):
        return (
            [],
            [ASSET_CACHE_MUTATION_REFUSAL],
            [
                "Asset cache/database mutation is not admitted; project-local Cache/assetdb.sqlite is read-only evidence only.",
                _ASSET_READBACK_SAFE_ALTERNATIVE,
            ],
        )

    if _contains_broad_product_resolve_intent(prompt_text):
        return (
            [],
            [ASSET_PRODUCT_RESOLVE_REFUSAL],
            [
                "Broad product/dependency catalog resolution and asset.product.resolve are not admitted.",
                _ASSET_READBACK_SAFE_ALTERNATIVE,
            ],
        )

    if _contains_asset_source_mutation_intent(prompt_text):
        return (
            [],
            [ASSET_SOURCE_MUTATION_REFUSAL],
            [
                "Source/product asset mutation is outside the Phase 9 read-only readback corridor.",
                _ASSET_READBACK_SAFE_ALTERNATIVE,
            ],
        )

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
            if source_glob:
                steps.append(
                    make_step(
                        step_id="asset-batch-1",
                        capability=capability,
                        request=request,
                        args={"source_glob": source_glob},
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append(
                    "asset.batch.process requires an explicit project-relative source glob in the prompt."
                )

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
                            "dry_run_plan": True,
                        },
                    )
                )
                requirement = capability_requirement_note(capability)
                if requirement:
                    requirements.append(requirement)
            else:
                refusals.append("asset.move.safe requires explicit source and destination paths in the prompt.")

    return steps, refusals, requirements
