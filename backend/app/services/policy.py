from app.models.control_plane import ToolPolicy
from app.services.catalog import catalog_service


def tool_real_admission_stage(tool_name: str) -> str:
    if tool_name == "project.inspect":
        return "real-read-only-active"
    if tool_name == "asset.source.inspect":
        return "real-read-only-active"
    if tool_name == "editor.component.property.get":
        return "real-read-only-active"
    if tool_name in {
        "editor.session.open",
        "editor.level.open",
        "editor.entity.create",
        "editor.component.add",
    }:
        return "real-editor-authoring-active"
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
    if tool_name == "asset.source.inspect":
        return (
            "Keep real execution limited to explicit project-local source-path "
            "identity and read-only metadata evidence, with products and "
            "dependencies marked unavailable unless a real admitted source is proven."
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
            "Keep the admitted real path limited to root-level named entity "
            "creation on the currently loaded level, without parenting, prefab "
            "instantiation, or transform placement."
        )
    if tool_name == "editor.component.add":
        return (
            "Keep the admitted real path limited to allowlist-bound component "
            "attachment on an explicit existing entity in the currently loaded "
            "level, without property mutation, removal, parenting, prefab work, "
            "or transform placement."
        )
    if tool_name == "editor.component.property.get":
        return (
            "Keep the admitted real path limited to explicit component-id and "
            "property-path readback on the currently loaded level, without "
            "property mutation, container edits, or component discovery "
            "broadening."
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


def tool_supports_dry_run(tool_name: str) -> bool:
    if tool_name in {
        "editor.session.open",
        "editor.level.open",
        "editor.entity.create",
        "editor.component.add",
        "editor.component.property.get",
    }:
        return False
    return True


def tool_policy_execution_mode(tool_name: str) -> str:
    admission_stage = tool_real_admission_stage(tool_name)
    if admission_stage in {
        "real-read-only-active",
        "real-editor-authoring-active",
    }:
        return "real"
    if admission_stage == "real-plan-only-active":
        return "plan-only"
    if admission_stage in {
        "real-mutation-preflight-active",
        "mutation-candidate-after-gate",
        "deferred-high-risk-mutation",
    }:
        return "gated"
    return "simulated"


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
                        supports_dry_run=tool_supports_dry_run(tool.name),
                        execution_mode=tool_policy_execution_mode(tool.name),
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
            supports_dry_run=tool_supports_dry_run(tool_name),
            execution_mode=tool_policy_execution_mode(tool_name),
        )


policy_service = PolicyService()
