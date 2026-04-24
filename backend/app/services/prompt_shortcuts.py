from app.models.prompt_control import (
    PromptShortcutOption,
    PromptShortcutRequest,
    PromptShortcutResponse,
)


FOCUS_LEADS = {
    "plan": "Create a safe implementation plan before changing O3DE.",
    "viewport": "Use the current viewport and selected tool area to shape the next admitted editor command.",
    "validate": "Validate the current step with runtime, bridge, records, and acceptance evidence.",
}

SOURCE_CONTEXT_PROMPT_LIMIT = 900


class PromptShortcutService:
    """Deterministic prompt shortcuts for fast UI adaptation without an LLM round trip."""

    def build_shortcuts(self, request: PromptShortcutRequest) -> PromptShortcutResponse:
        focus_lead = FOCUS_LEADS.get(request.focus_id, FOCUS_LEADS["plan"])
        profile = request.project_profile_name or "no selected project profile"
        source_context = self._format_source_context(request)
        context = (
            f"Scenario: {request.scenario_label}. Stage: {request.stage_label}. "
            f"Viewport: {request.viewport_label}. Tool area: {request.active_tool_label}. "
            f"Project profile: {profile}.{source_context}"
        )

        shortcuts = [
            PromptShortcutOption(
                shortcut_id="analyze-viewport-recommend",
                title="Analyze viewport and recommend",
                prompt_text=(
                    "Analyze the current O3DE viewport/context, identify what is visible or selected, "
                    "then recommend the next safe production step. Do not mutate the project yet. "
                    f"Use this context: {context}"
                ),
                evidence_gate=(
                    "The answer should separate observations, recommendations, admitted real actions, "
                    "simulated/plan-only actions, and what evidence to collect next."
                ),
                source="backend-static-shortcuts-v1",
            ),
            PromptShortcutOption(
                shortcut_id="context-aware-next-step",
                title="Context-aware next step",
                prompt_text=f"{focus_lead} {context}",
                evidence_gate=(
                    "Confirm Runtime readiness, bridge state, Prompt Studio plan, and Records evidence "
                    "before treating the step as complete."
                ),
                source="backend-static-shortcuts-v1",
            ),
            PromptShortcutOption(
                shortcut_id="builder-task-draft",
                title="Turn into Builder task",
                prompt_text=(
                    "Create a mission-control task from this context with scope paths, owner, "
                    f"verification steps, and rollback notes. {context}"
                ),
                evidence_gate=(
                    "The task should be claimed before edits begin and completed only after tests or "
                    "operator evidence are attached."
                ),
                source="backend-static-shortcuts-v1",
            ),
            PromptShortcutOption(
                shortcut_id="safety-check",
                title="Safety check",
                prompt_text=(
                    "Check whether this step is admitted real, simulated, or plan-only before acting. "
                    f"{context}"
                ),
                evidence_gate=(
                    "The response must name admitted capabilities, rejected surfaces, approval needs, "
                    "and exact follow-up evidence."
                ),
                source="backend-static-shortcuts-v1",
            ),
        ]

        return PromptShortcutResponse(
            mode=request.mode,
            scenario_id=request.scenario_id,
            stage_label=request.stage_label,
            focus_id=request.focus_id,
            shortcuts=shortcuts,
            generated_by="deterministic-backend-shortcuts-v1",
        )


    def _format_source_context(self, request: PromptShortcutRequest) -> str:
        if not request.source_context:
            return ""

        cleaned = " ".join(request.source_context.split())
        if not cleaned:
            return ""

        excerpt = cleaned[:SOURCE_CONTEXT_PROMPT_LIMIT]
        suffix = "..." if len(cleaned) > SOURCE_CONTEXT_PROMPT_LIMIT else ""
        source_name = request.source_context_name or "operator-provided source"
        return f" Source context ({source_name}): {excerpt}{suffix}."


prompt_shortcut_service = PromptShortcutService()
