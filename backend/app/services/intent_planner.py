from __future__ import annotations

from uuid import uuid4

from app.models.prompt_control import PromptRequest
from app.models.prompt_plan import PromptPlan
from app.services.planners.global_intent_planner import global_intent_planner


class IntentPlannerService:
    def create_plan(self, request: PromptRequest) -> PromptPlan:
        steps, refusals, requirements, refusal_reason = global_intent_planner.plan(request)
        summary = (
            f"Compiled {len(steps)} typed step(s) from the prompt across "
            f"{len({step.agent for step in steps})} capability domain(s)."
            if steps
            else "Prompt did not compile into an admitted typed control-plane plan."
        )
        if not steps and refusal_reason is None:
            refusal_reason = (
                "Prompt planning did not yield an admitted typed capability match."
            )
        return PromptPlan(
            prompt_id=request.prompt_id,
            plan_id=f"plan-{uuid4().hex[:12]}",
            admitted=bool(steps),
            refusal_reason=refusal_reason,
            summary=summary,
            steps=steps,
            refused_capabilities=refusals,
            capability_requirements=requirements,
        )


intent_planner_service = IntentPlannerService()
