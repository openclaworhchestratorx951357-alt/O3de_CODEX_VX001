from app.models.control_plane import ToolPolicy
from app.services.catalog import catalog_service


def tool_real_admission_stage(tool_name: str) -> str:
    if tool_name == "project.inspect":
        return "real-read-only-active"
    if tool_name == "asset.processor.status":
        return "real-read-only-active"
    if tool_name == "asset.source.inspect":
        return "real-read-only-active"
    if tool_name == "asset.batch.process":
        return "real-plan-only-active"
    if tool_name == "asset.move.safe":
        return "real-plan-only-active"
    if tool_name == "render.capture.viewport":
        return "real-read-only-active"
    if tool_name == "render.material.inspect":
        return "real-read-only-active"
    if tool_name == "test.run.gtest":
        return "real-plan-only-active"
    if tool_name == "test.run.editor_python":
        return "real-plan-only-active"
    if tool_name == "test.tiaf.sequence":
        return "real-plan-only-active"
    if tool_name in {
        "editor.entity.exists",
        "editor.component.find",
        "editor.component.property.get",
    }:
        return "real-read-only-active"
    if (
        tool_name
        == "editor.component.property.write.camera_bool_make_active_on_activation"
    ):
        return "real-mutation-preflight-active"
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
        return "real-mutation-preflight-active"
    if tool_name == "render.material.patch":
        return "real-mutation-preflight-active"
    if tool_name == "render.shader.rebuild":
        return "real-plan-only-active"
    if tool_name == "build.compile":
        return "real-execution-gated-active"
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
    if tool_name == "asset.processor.status":
        return (
            "Keep real execution limited to host-visible Asset Processor runtime "
            "availability evidence, with job and platform fields marked unavailable "
            "unless an admitted real telemetry substrate is proven."
        )
    if tool_name == "asset.batch.process":
        return (
            "Keep real execution limited to explicit project-relative source-glob "
            "asset batch preflight and result-truth evidence, with actual asset "
            "processing execution, job results, and output artifact production "
            "marked unavailable unless a real admitted batch runner path is proven."
        )
    if tool_name == "asset.move.safe":
        return (
            "Keep real execution limited to explicit source/destination asset "
            "identity corridor and reference-unavailable preflight evidence, with "
            "actual asset move mutation, overwrite semantics, and reference repair "
            "marked unavailable unless a real admitted mutation path is proven."
        )
    if tool_name == "render.capture.viewport":
        return (
            "Keep real execution limited to explicit viewport-capture substrate "
            "evidence and artifact-presence reporting, with screenshot production "
            "and capture failure semantics marked unavailable unless a real admitted "
            "capture path is proven."
        )
    if tool_name == "render.material.inspect":
        return (
            "Keep real execution limited to explicit material-inspection substrate "
            "evidence, explicit project-local material readback evidence, and "
            "material-evidence reporting, while runtime material readback, shader "
            "data expansion, and reference expansion remain unavailable unless a "
            "broader admitted inspection path is proven."
        )
    if tool_name == "test.run.gtest":
        return (
            "Keep real execution limited to explicit gtest runner preflight and "
            "result-truth evidence, with native test execution, exit semantics, and "
            "result artifact production marked unavailable unless a real admitted runner "
            "path is proven."
        )
    if tool_name == "test.run.editor_python":
        return (
            "Keep real execution limited to explicit editor-python runner preflight and "
            "result-truth evidence, with editor-hosted test execution, exit semantics, and "
            "structured result artifact production marked unavailable unless a real admitted runner "
            "path is proven."
        )
    if tool_name == "test.tiaf.sequence":
        return (
            "Keep real execution limited to explicit TIAF runner preflight and "
            "result-truth evidence, with TIAF sequence execution, exit semantics, and "
            "structured result artifact production marked unavailable unless a real admitted runner "
            "path is proven."
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
    if tool_name == "editor.entity.exists":
        return (
            "Keep the admitted real path limited to explicit entity id or exact "
            "entity name existence readback on the currently loaded level, without "
            "delete, reload, discovery broadening, parenting, prefab, or property "
            "mutation."
        )
    if tool_name == "editor.component.add":
        return (
            "Keep the admitted real path limited to allowlist-bound component "
            "attachment on an explicit existing entity in the currently loaded "
            "level, without property mutation, removal, parenting, prefab work, "
            "or transform placement."
        )
    if tool_name == "editor.component.find":
        return (
            "Keep the admitted real path limited to exact entity id or exact "
            "entity-name lookup plus one allowlisted component target binding "
            "on the currently loaded level, without property listing, property "
            "mutation, prefab-derived ids, or broad component enumeration."
        )
    if tool_name == "editor.component.property.get":
        return (
            "Keep the admitted real path limited to explicit component-id and "
            "property-path readback on the currently loaded level, without "
            "property mutation, container edits, or component discovery "
            "broadening."
        )
    if (
        tool_name
        == "editor.component.property.write.camera_bool_make_active_on_activation"
    ):
        return (
            "Keep real execution limited to the exact Camera bool path "
            "Controller|Configuration|Make active camera on activation? using a "
            "live component id returned by admitted editor.component.add, with "
            "before/write/after readback evidence and no public property list or "
            "generic property write admission."
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
            "Keep real execution tightly limited to explicit gem.enable preflight "
            "and the first manifest-backed local gem_names insertion path, with "
            "backup, rollback, post-write verification, and failure-visible "
            "behavior kept explicit while version resolution, optional semantics, "
            "dependency recovery, and downstream configure impacts remain unavailable."
        )
    if tool_name == "render.material.patch":
        return (
            "Keep real execution tightly limited to explicit project-local .material "
            "propertyValues patching with backup, rollback, post-write readback "
            "verification, and optional explicit post-patch shader preflight review "
            "evidence, while runtime material readback, actual shader rebuild "
            "execution, and reference repair remain unavailable."
        )
    if tool_name == "render.shader.rebuild":
        return (
            "Keep real execution limited to explicit render.shader.rebuild preflight "
            "and result-truth evidence, with actual shader rebuild execution, exit "
            "semantics, and result artifact production marked unavailable unless a "
            "real admitted shader rebuild runner path is proven."
        )
    if tool_name == "build.compile":
        return (
            "Keep real execution limited to explicit build.compile runner invocation, "
            "exit-code truth, and retained log artifact evidence for named targets, "
            "while compiled output artifact verification remains unavailable unless a "
            "broader admitted build-result path is proven."
        )
    return "Remain simulated until a tool-specific real adapter gate is admitted."


def tool_supports_dry_run(tool_name: str) -> bool:
    if tool_name in {
        "editor.session.open",
        "editor.level.open",
        "editor.entity.create",
        "editor.entity.exists",
        "editor.component.find",
        "editor.component.add",
        "editor.component.property.get",
        "editor.component.property.write.camera_bool_make_active_on_activation",
    }:
        return False
    return True


def tool_policy_execution_mode(tool_name: str) -> str:
    admission_stage = tool_real_admission_stage(tool_name)
    if admission_stage in {
        "real-read-only-active",
        "real-editor-authoring-active",
        "real-execution-gated-active",
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
