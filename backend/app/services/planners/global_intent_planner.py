from __future__ import annotations

from app.models.prompt_control import PromptRequest
from app.models.prompt_step import PromptPlanStep
from app.services.planners.asset_pipeline_planner import (
    ASSET_CACHE_MUTATION_REFUSAL,
    ASSET_PROCESSOR_EXECUTION_REFUSAL,
    ASSET_PRODUCT_RESOLVE_REFUSAL,
    ASSET_SOURCE_MUTATION_REFUSAL,
    plan_asset_pipeline_prompt,
)
from app.services.planners.editor_planner import (
    CANDIDATE_EDITOR_MUTATION_REFUSAL,
    EDITOR_PROPERTY_DISCOVERY_REFUSAL,
    plan_editor_prompt,
)
from app.services.planners.project_build_planner import plan_project_build_prompt
from app.services.planners.render_lookdev_planner import plan_render_lookdev_prompt
from app.services.planners.validation_planner import plan_validation_prompt


_ARBITRARY_EXECUTION_MARKERS = (
    "python script",
    "powershell",
    "shell command",
    "terminal command",
    "bash script",
    "arbitrary code",
)


class GlobalIntentPlanner:
    def plan(
        self,
        request: PromptRequest,
    ) -> tuple[list[PromptPlanStep], list[str], list[str], str | None]:
        prompt_lower = request.prompt_text.lower()
        if any(marker in prompt_lower for marker in _ARBITRARY_EXECUTION_MARKERS):
            return [], ["arbitrary-command-execution"], [], (
                "Prompt execution is limited to admitted catalog capabilities and refuses arbitrary shell, Python, or editor commands."
            )

        preferred_domains = {
            domain.strip().lower()
            for domain in request.preferred_domains
            if domain.strip()
        }
        planner_functions = [
            ("project-build", plan_project_build_prompt),
            ("editor-control", plan_editor_prompt),
            ("asset-pipeline", plan_asset_pipeline_prompt),
            ("render-lookdev", plan_render_lookdev_prompt),
            ("validation", plan_validation_prompt),
        ]
        steps: list[PromptPlanStep] = []
        refusals: list[str] = []
        requirements: list[str] = []

        for domain, planner in planner_functions:
            if preferred_domains and domain not in preferred_domains:
                continue
            domain_steps, domain_refusals, domain_requirements = planner(request)
            steps.extend(domain_steps)
            refusals.extend(domain_refusals)
            requirements.extend(domain_requirements)

        if not steps:
            refusal_reason = (
                "The prompt did not resolve to any admitted typed O3DE capability. Provide a concrete project, editor, asset, render, or validation action that maps to the published tool catalog."
            )
            if CANDIDATE_EDITOR_MUTATION_REFUSAL in refusals:
                refusal_reason = (
                    "The requested editor mutation is outside the admitted Phase 8 "
                    "editor envelope. Candidate mutation surfaces must first prove "
                    "backup, restore/reload, post-restore verification, and "
                    "operator-visible review before prompt admission."
                )
            elif EDITOR_PROPERTY_DISCOVERY_REFUSAL in refusals:
                refusal_reason = (
                    "Component property listing is not admitted yet. The Phase 8 "
                    "property target discovery packet must first prove a typed "
                    "read-only property-list corridor before Prompt Studio can "
                    "plan this request."
                )
            elif "editor.entity.create" in refusals:
                refusal_reason = (
                    "editor.entity.create is admitted only through the bounded "
                    "editor authoring prompt contract; this prompt did not provide "
                    "the supported inputs for an admitted typed editor plan."
                )
            elif ASSET_PROCESSOR_EXECUTION_REFUSAL in refusals:
                refusal_reason = (
                    "Asset Processor execution is not admitted from Prompt Studio. "
                    "The Phase 9 asset corridor can only inspect an explicit source "
                    "asset and read existing project-local assetdb.sqlite evidence."
                )
            elif ASSET_CACHE_MUTATION_REFUSAL in refusals:
                refusal_reason = (
                    "Asset cache or asset database mutation is not admitted. "
                    "Cache/assetdb.sqlite may be inspected only as a read-only "
                    "evidence substrate."
                )
            elif ASSET_PRODUCT_RESOLVE_REFUSAL in refusals:
                refusal_reason = (
                    "Broad product/dependency catalog resolution is not admitted. "
                    "asset.product.resolve remains unavailable; use exact "
                    "asset.source.inspect readback for one explicit source asset."
                )
            elif ASSET_SOURCE_MUTATION_REFUSAL in refusals:
                refusal_reason = (
                    "Source and product asset mutation is outside the Phase 9 "
                    "read-only readback corridor. Use asset.source.inspect for "
                    "evidence readback without modifying project files."
                )
            return [], refusals or ["no-admitted-capability-match"], requirements, refusal_reason

        deduped_requirements: list[str] = []
        seen_requirements: set[str] = set()
        for item in requirements:
            if item not in seen_requirements:
                deduped_requirements.append(item)
                seen_requirements.add(item)

        deduped_refusals: list[str] = []
        seen_refusals: set[str] = set()
        for item in refusals:
            if item not in seen_refusals:
                deduped_refusals.append(item)
                seen_refusals.add(item)

        return steps, deduped_refusals, deduped_requirements, None


global_intent_planner = GlobalIntentPlanner()
