from app.models.control_plane import ToolPolicy
from app.services.catalog import catalog_service


def tool_real_admission_stage(tool_name: str) -> str:
    if tool_name == "project.inspect":
        return "real-read-only-active"
    if tool_name in {
        "editor.session.open",
        "editor.level.open",
    }:
        return "real-editor-authoring-active"
    if tool_name == "editor.entity.create":
        return "runtime-reaching-excluded-from-admitted-real"
    if tool_name == "build.configure":
        return "real-plan-only-active"
    if tool_name == "settings.patch":
        return "real-mutation-preflight-active"
    if tool_name == "gem.enable":
        return "mutation-candidate-after-gate"
    if tool_name == "build.compile":
        return "deferred-high-risk-mutation"
    return "simulated-only"


def tool_next_real_requirement(tool_name: str) -> str:
    if tool_name == "project.inspect":
        return (
            "Keep manifest-backed read-only evidence truthful; do not widen into "
            "mutation from this path."
        )
    if tool_name == "editor.session.open":
        return (
            "Keep the admitted real path limited to runtime-owned session "
            "attachment with explicit editor-runtime and PythonEditorBindings "
            "preflight rejection."
        )
    if tool_name == "editor.level.open":
        return (
            "Keep the admitted real path limited to explicit level open/create "
            "through the runtime-owned editor script contract."
        )
    if tool_name == "editor.entity.create":
        return (
            "Keep editor.entity.create explicitly labeled as runtime-reaching "
            "and excluded from the admitted real set on current tested local "
            "targets until a stable prefab-safe create contract is proven."
        )
    if tool_name == "build.configure":
        return (
            "Keep real execution limited to dry-run preflight until configure "
            "mutation admission criteria are explicitly met."
        )
    if tool_name == "settings.patch":
        return (
            "Keep real execution tightly limited to the admitted manifest-backed "
            "preflight and first set-only mutation path, with backup, rollback, "
            "post-write verification, and failure-visible behavior kept explicit."
        )
    if tool_name == "gem.enable":
        return (
            "Wait until the first mutation gate is proven and Gem-specific recovery "
            "and downstream configure impacts are operator-visible."
        )
    if tool_name == "build.compile":
        return (
            "Defer until mutation-capable configure admission and stronger runtime "
            "dependency evidence are both proven."
        )
    return "Remain simulated until a tool-specific real adapter gate is admitted."


class PolicyService:
    def list_policies(self) -> list[ToolPolicy]:
        policies: list[ToolPolicy] = []
        for agent in catalog_service.get_catalog_model().agents:
            for tool in agent.tools:
                policies.append(
                    ToolPolicy(
                        agent=agent.id,
                        tool=tool.name,
                        approval_class=tool.approval_class,
                        adapter_family=tool.adapter_family,
                        capability_status=tool.capability_status,
                        real_admission_stage=tool_real_admission_stage(tool.name),
                        next_real_requirement=tool_next_real_requirement(tool.name),
                        args_schema=tool.args_schema,
                        result_schema=tool.result_schema,
                        required_locks=tool.default_locks,
                        risk=tool.risk,
                        requires_approval=tool.approval_class != "read_only",
                    )
                )
        return sorted(policies, key=lambda policy: (policy.agent, policy.tool))

    def get_policy(self, agent_id: str, tool_name: str) -> ToolPolicy | None:
        tool = catalog_service.get_tool_definition(agent_id, tool_name)
        if tool is None:
            return None
        return ToolPolicy(
            agent=agent_id,
            tool=tool_name,
            approval_class=tool.approval_class,
            adapter_family=tool.adapter_family,
            capability_status=tool.capability_status,
            real_admission_stage=tool_real_admission_stage(tool_name),
            next_real_requirement=tool_next_real_requirement(tool_name),
            args_schema=tool.args_schema,
            result_schema=tool.result_schema,
            required_locks=tool.default_locks,
            risk=tool.risk,
            requires_approval=tool.approval_class != "read_only",
        )


policy_service = PolicyService()
