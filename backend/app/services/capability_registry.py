from __future__ import annotations

from typing import Any

from app.models.prompt_control import PromptCapabilitiesResponse, PromptCapabilityEntry
from app.models.prompt_safety import PromptSafetyEnvelope
from app.services.policy import policy_service
from app.services.schema_validation import schema_validation_service


def _build_safety_envelope(
    *,
    state_scope: str,
    backup_class: str,
    rollback_class: str,
    verification_class: str,
    retention_class: str,
    natural_language_status: str,
    natural_language_blocker: str | None = None,
) -> PromptSafetyEnvelope:
    return PromptSafetyEnvelope(
        state_scope=state_scope,
        backup_class=backup_class,
        rollback_class=rollback_class,
        verification_class=verification_class,
        retention_class=retention_class,
        natural_language_status=natural_language_status,
        natural_language_blocker=natural_language_blocker,
    )


def _default_safety_envelope_for_tool(tool_name: str) -> PromptSafetyEnvelope:
    if tool_name == "editor.session.open":
        return _build_safety_envelope(
            state_scope="Editor-session attachment scoped to the active project target.",
            backup_class="none",
            rollback_class="none",
            verification_class="editor-session heartbeat and runtime context verification",
            retention_class="editor-runtime-evidence",
            natural_language_status="prompt-ready-approval-gated",
        )
    if tool_name == "editor.level.open":
        return _build_safety_envelope(
            state_scope="Explicit level open/create within the current editor project context.",
            backup_class="operator-managed-level-snapshot-when-creating-or-overwriting",
            rollback_class="manual-level-restore-or-level-delete",
            verification_class="loaded-level-context verification",
            retention_class="editor-runtime-evidence",
            natural_language_status="prompt-ready-approval-gated",
        )
    if tool_name == "editor.entity.create":
        return _build_safety_envelope(
            state_scope="Explicit entity creation within the currently loaded level.",
            backup_class="operator-managed-level-snapshot-before-entity-mutation",
            rollback_class="manual-level-restore-or-explicit-entity-removal",
            verification_class="entity-readback-and-level-context verification",
            retention_class="editor-runtime-evidence",
            natural_language_status="prompt-ready-approval-gated",
        )
    if tool_name == "editor.component.add":
        return _build_safety_envelope(
            state_scope="Explicit allowlisted component attachment on an existing entity in the currently loaded level.",
            backup_class="operator-managed-level-snapshot-before-component-mutation",
            rollback_class="manual-component-removal-or-level-restore",
            verification_class="entity-component readback verification",
            retention_class="editor-runtime-evidence",
            natural_language_status="prompt-ready-approval-gated",
        )
    if tool_name == "editor.component.property.get":
        return _build_safety_envelope(
            state_scope="Explicit component property readback on an existing component in the currently loaded level.",
            backup_class="none",
            rollback_class="none",
            verification_class="component-property readback verification",
            retention_class="editor-runtime-evidence",
            natural_language_status="prompt-ready-read-only",
        )
    if tool_name == "project.inspect":
        return _build_safety_envelope(
            state_scope="Manifest-backed project/config/settings/gem read scope.",
            backup_class="none",
            rollback_class="none",
            verification_class="manifest readback and provenance verification",
            retention_class="manifest-inspection-evidence",
            natural_language_status="prompt-ready-read-only",
        )
    if tool_name == "asset.processor.status":
        return _build_safety_envelope(
            state_scope="Project Asset Processor runtime availability query.",
            backup_class="none",
            rollback_class="none",
            verification_class="host runtime visibility readback",
            retention_class="operator-summary-evidence",
            natural_language_status="prompt-ready-read-only",
        )
    if tool_name == "asset.source.inspect":
        return _build_safety_envelope(
            state_scope="Single project-local source-asset identity and dependency read scope.",
            backup_class="none",
            rollback_class="none",
            verification_class="source-path resolution and metadata readback verification",
            retention_class="inspection-evidence",
            natural_language_status="prompt-ready-read-only",
        )
    if tool_name == "asset.batch.process":
        return _build_safety_envelope(
            state_scope="Explicit project-relative source-glob asset batch preflight scope.",
            backup_class="none",
            rollback_class="environment-cleanup-only",
            verification_class="runtime probe and source candidate coverage verification",
            retention_class="pipeline-log-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name == "render.capture.viewport":
        return _build_safety_envelope(
            state_scope="Explicit viewport-capture evidence request.",
            backup_class="none",
            rollback_class="none",
            verification_class="runtime probe and capture artifact metadata verification",
            retention_class="capture-evidence",
            natural_language_status="prompt-ready-read-only",
        )
    if tool_name == "render.material.inspect":
        return _build_safety_envelope(
            state_scope="Explicit material inspection evidence request.",
            backup_class="none",
            rollback_class="none",
            verification_class="runtime probe and material evidence metadata verification",
            retention_class="inspection-evidence",
            natural_language_status="prompt-ready-read-only",
        )
    if tool_name == "test.visual.diff":
        return _build_safety_envelope(
            state_scope="Explicit baseline-versus-candidate artifact comparison scope.",
            backup_class="none",
            rollback_class="none",
            verification_class="artifact resolution and comparison readback verification",
            retention_class="visual-diff-evidence",
            natural_language_status="prompt-ready-read-only",
        )
    if tool_name == "test.run.gtest":
        return _build_safety_envelope(
            state_scope="Explicit native test target preflight scope.",
            backup_class="none",
            rollback_class="environment-cleanup-only",
            verification_class="runner preflight and target-path verification",
            retention_class="test-log-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name == "test.run.editor_python":
        return _build_safety_envelope(
            state_scope="Explicit editor Python module preflight scope.",
            backup_class="none",
            rollback_class="environment-cleanup-only",
            verification_class="editor runner preflight and target-path verification",
            retention_class="test-log-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name == "test.tiaf.sequence":
        return _build_safety_envelope(
            state_scope="Explicit TIAF sequence preflight scope.",
            backup_class="none",
            rollback_class="environment-cleanup-only",
            verification_class="TIAF runner preflight and runtime-context verification",
            retention_class="test-log-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name == "settings.patch":
        return _build_safety_envelope(
            state_scope="Manifest-backed admitted settings mutation subset.",
            backup_class="manifest-snapshot",
            rollback_class="restore-backed-file",
            verification_class="post-write manifest readback verification",
            retention_class="mutation-verification-evidence",
            natural_language_status="prompt-ready-approval-gated",
        )
    if tool_name == "build.configure":
        return _build_safety_envelope(
            state_scope="Workspace-local configure plan or configure runner boundary.",
            backup_class="none",
            rollback_class="none",
            verification_class="configure plan and target-root validation",
            retention_class="configure-plan-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name == "asset.move.safe":
        return _build_safety_envelope(
            state_scope="Explicit source-to-destination asset identity/reference preflight corridor.",
            backup_class="none",
            rollback_class="environment-cleanup-only",
            verification_class="source/destination identity corridor and reference-unavailable verification",
            retention_class="asset-move-preflight-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name == "gem.enable":
        return _build_safety_envelope(
            state_scope="Manifest-backed explicit local gem_names insertion scope.",
            backup_class="manifest-snapshot",
            rollback_class="restore-backed-file",
            verification_class="post-write manifest gem_names readback verification",
            retention_class="mutation-verification-evidence",
            natural_language_status="prompt-ready-approval-gated",
        )
    if tool_name == "build.compile":
        return _build_safety_envelope(
            state_scope="Workspace-local explicit target build preflight scope.",
            backup_class="none",
            rollback_class="environment-cleanup-only",
            verification_class="configured build tree and target artifact candidate verification",
            retention_class="build-log-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name == "render.material.patch":
        return _build_safety_envelope(
            state_scope="Explicit local .material top-level propertyValues override scope.",
            backup_class="material-file-backup",
            rollback_class="restore-backed-file",
            verification_class="post-write material propertyValues readback verification",
            retention_class="render-mutation-evidence",
            natural_language_status="prompt-ready-approval-gated",
        )
    if tool_name == "render.shader.rebuild":
        return _build_safety_envelope(
            state_scope="Explicit shader target rebuild preflight scope.",
            backup_class="none",
            rollback_class="workspace-clean-or-shader-cache-reset",
            verification_class="configured build tree and shader source candidate verification",
            retention_class="render-log-evidence",
            natural_language_status="prompt-ready-plan-only",
        )
    if tool_name in {
        "asset.processor.status",
        "asset.source.inspect",
        "asset.batch.process",
        "render.material.inspect",
        "render.capture.viewport",
        "test.run.gtest",
        "test.run.editor_python",
        "test.tiaf.sequence",
        "test.visual.diff",
    }:
        scope_by_tool = {
            "asset.processor.status": "Project asset processor status query.",
            "asset.source.inspect": "Single source-asset identity and dependency read scope.",
            "asset.batch.process": "Explicit project-relative source-glob asset batch preflight within the current project.",
            "render.material.inspect": "Single material inspection scope.",
            "render.shader.rebuild": "Explicit shader target rebuild scope.",
            "render.capture.viewport": "Explicit viewport capture request.",
            "test.run.gtest": "Explicit native test target set.",
            "test.run.editor_python": "Explicit editor Python test module set.",
            "test.tiaf.sequence": "Explicit TIAF sequence and platform scope.",
            "test.visual.diff": "Explicit baseline-versus-candidate visual comparison scope.",
        }
        verification_by_tool = {
            "asset.processor.status": "processor-status readback",
            "asset.source.inspect": "asset metadata readback",
            "asset.batch.process": "runtime probe and source candidate coverage verification",
            "render.material.inspect": "material readback verification",
            "render.shader.rebuild": "shader output and log verification",
            "render.capture.viewport": "capture artifact existence and metadata verification",
            "test.run.gtest": "exit-status and result-file verification",
            "test.run.editor_python": "exit-status and structured test artifact verification",
            "test.tiaf.sequence": "sequence result and artifact verification",
            "test.visual.diff": "diff artifact and threshold verification",
        }
        retention_by_tool = {
            "asset.processor.status": "operator-summary-evidence",
            "asset.source.inspect": "inspection-evidence",
            "asset.batch.process": "pipeline-log-evidence",
            "render.material.inspect": "inspection-evidence",
            "render.shader.rebuild": "render-log-evidence",
            "render.capture.viewport": "capture-evidence",
            "test.run.gtest": "test-log-evidence",
            "test.run.editor_python": "test-log-evidence",
            "test.tiaf.sequence": "test-log-evidence",
            "test.visual.diff": "visual-diff-evidence",
        }
        rollback_by_tool = {
            "render.shader.rebuild": "workspace-clean-or-shader-cache-reset",
            "test.run.gtest": "environment-cleanup-only",
            "test.run.editor_python": "environment-cleanup-only",
            "test.tiaf.sequence": "environment-cleanup-only",
        }
        return _build_safety_envelope(
            state_scope=scope_by_tool[tool_name],
            backup_class="none",
            rollback_class=rollback_by_tool.get(tool_name, "none"),
            verification_class=verification_by_tool[tool_name],
            retention_class=retention_by_tool[tool_name],
            natural_language_status="prompt-ready-simulated",
        )
    return _build_safety_envelope(
        state_scope="Typed control-plane surface with explicitly bounded state scope.",
        backup_class="unspecified",
        rollback_class="unspecified",
        verification_class="unspecified",
        retention_class="operator-summary-evidence",
        natural_language_status="prompt-ready-simulated",
    )


_CAPABILITY_METADATA: dict[str, dict[str, Any]] = {
    "editor.session.open": {
        "capability_maturity": "real-authoring",
        "planner_intent_aliases": [
            "open editor",
            "attach editor",
            "editor session",
            "ensure editor session",
        ],
        "natural_language_affordances": [
            "Open or attach to an editor session through the typed control plane on the admitted real path.",
        ],
        "allowlisted_parameter_surfaces": ["session_mode", "project_path", "level_path", "timeout_s"],
        "real_adapter_availability": True,
        "dry_run_availability": False,
        "simulation_fallback_availability": False,
    },
    "editor.level.open": {
        "capability_maturity": "real-authoring",
        "planner_intent_aliases": ["open level", "load level", "edit level"],
        "natural_language_affordances": ["Open a level by explicit level path."],
        "allowlisted_parameter_surfaces": ["level_path", "make_writable", "focus_viewport"],
        "real_adapter_availability": True,
        "dry_run_availability": False,
        "simulation_fallback_availability": False,
    },
    "editor.entity.create": {
        "capability_maturity": "real-authoring",
        "planner_intent_aliases": ["create entity", "spawn entity", "add entity"],
        "natural_language_affordances": [
            "Create a root-level named entity in the currently loaded level through the admitted real editor path."
        ],
        "allowlisted_parameter_surfaces": ["entity_name", "level_path"],
        "real_adapter_availability": True,
        "dry_run_availability": False,
        "simulation_fallback_availability": False,
    },
    "editor.component.add": {
        "capability_maturity": "real-authoring",
        "planner_intent_aliases": ["add component", "attach component", "component on entity"],
        "natural_language_affordances": [
            "Attach allowlisted components to an explicit existing entity id in the currently loaded level through the admitted real editor path."
        ],
        "allowlisted_parameter_surfaces": ["entity_id", "components", "level_path"],
        "real_adapter_availability": True,
        "dry_run_availability": False,
        "simulation_fallback_availability": False,
    },
    "editor.component.property.get": {
        "capability_maturity": "hybrid-read-only",
        "planner_intent_aliases": [
            "get component property",
            "read component property",
            "inspect component property",
        ],
        "natural_language_affordances": [
            "Read an explicit component property from an explicit component id in the currently loaded level through the admitted real editor path."
        ],
        "allowlisted_parameter_surfaces": ["component_id", "property_path", "level_path"],
        "real_adapter_availability": True,
        "dry_run_availability": False,
        "simulation_fallback_availability": False,
    },
    "asset.processor.status": {
        "capability_maturity": "hybrid-read-only",
        "planner_intent_aliases": ["asset processor status", "asset status", "asset processor"],
        "natural_language_affordances": [
            "Inspect Asset Processor runtime availability through the admitted real host probe."
        ],
        "allowlisted_parameter_surfaces": ["include_jobs", "include_platforms"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "asset.source.inspect": {
        "capability_maturity": "hybrid-read-only",
        "planner_intent_aliases": ["inspect asset", "source asset", "asset metadata"],
        "natural_language_affordances": ["Inspect a source asset by explicit path."],
        "allowlisted_parameter_surfaces": ["source_path", "include_products", "include_dependencies"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "asset.batch.process": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["process assets", "asset batch", "asset pipeline batch"],
        "natural_language_affordances": [
            "Preflight an explicit asset batch request against project-local source candidates and admitted Asset Processor runtime evidence."
        ],
        "allowlisted_parameter_surfaces": ["source_glob", "platforms", "clean", "max_jobs"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "asset.move.safe": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["move asset", "rename asset", "relocate asset"],
        "natural_language_affordances": [
            "Preflight an explicit source-to-destination asset move request against project-local identity corridor evidence."
        ],
        "allowlisted_parameter_surfaces": ["source_path", "destination_path", "update_references", "dry_run_plan"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "project.inspect": {
        "capability_maturity": "hybrid-read-only",
        "planner_intent_aliases": ["inspect project", "project manifest", "show project settings", "project config"],
        "natural_language_affordances": ["Inspect project manifest-backed config, settings, gems, and build-state evidence."],
        "allowlisted_parameter_surfaces": [
            "include_project_config",
            "project_config_keys",
            "include_gems",
            "requested_gem_names",
            "include_settings",
            "requested_settings_keys",
            "include_build_state",
        ],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "settings.patch": {
        "capability_maturity": "hybrid-mutation",
        "planner_intent_aliases": ["patch settings", "set version", "change project name", "update settings"],
        "natural_language_affordances": ["Apply an admitted manifest-backed settings patch through explicit typed operations."],
        "allowlisted_parameter_surfaces": ["registry_path", "operations"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "gem.enable": {
        "capability_maturity": "hybrid-mutation",
        "planner_intent_aliases": ["enable gem", "add gem"],
        "natural_language_affordances": [
            "Preflight an explicit Gem enable request and, for the first admitted local gem_names corridor, apply a backup-verified manifest insertion."
        ],
        "allowlisted_parameter_surfaces": ["gem_name", "version", "optional"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "build.configure": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["configure build", "cmake configure", "refresh build tree"],
        "natural_language_affordances": ["Run a typed build configure preflight or plan-oriented configure request."],
        "allowlisted_parameter_surfaces": ["preset", "generator", "config", "clean"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "build.compile": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["compile target", "build target", "compile project"],
        "natural_language_affordances": ["Compile explicit named targets through a typed build request."],
        "allowlisted_parameter_surfaces": ["targets", "config", "parallel_jobs"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.material.inspect": {
        "capability_maturity": "hybrid-read-only",
        "planner_intent_aliases": ["inspect material", "show material", "material details"],
        "natural_language_affordances": ["Inspect a material by explicit material path."],
        "allowlisted_parameter_surfaces": ["material_path", "include_shader_data", "include_references"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.material.patch": {
        "capability_maturity": "hybrid-mutation",
        "planner_intent_aliases": ["patch material", "set material", "update material property"],
        "natural_language_affordances": [
            "Preflight an explicit local .material propertyValues override request and, for the first admitted corridor, apply a backup-verified local material patch."
        ],
        "allowlisted_parameter_surfaces": ["material_path", "property_overrides", "create_backup"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.shader.rebuild": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["rebuild shader", "recompile shader"],
        "natural_language_affordances": [
            "Run an explicit shader rebuild preflight for named shader targets."
        ],
        "allowlisted_parameter_surfaces": ["shader_targets", "platforms", "force"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.capture.viewport": {
        "capability_maturity": "hybrid-read-only",
        "planner_intent_aliases": ["capture viewport", "viewport screenshot", "take screenshot"],
        "natural_language_affordances": ["Capture a viewport image with an optional camera and resolution."],
        "allowlisted_parameter_surfaces": ["output_label", "camera_entity_id", "resolution"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.run.gtest": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["run gtest", "native test", "gtest target"],
        "natural_language_affordances": ["Run explicit native test targets."],
        "allowlisted_parameter_surfaces": ["test_targets", "filter", "timeout_s"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.run.editor_python": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["run editor python test", "editor python module", "editor python validation"],
        "natural_language_affordances": ["Run explicit editor Python test modules."],
        "allowlisted_parameter_surfaces": ["test_modules", "editor_args", "timeout_s"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.tiaf.sequence": {
        "capability_maturity": "plan-only",
        "planner_intent_aliases": ["run tiaf", "tiaf sequence", "test impact analysis"],
        "natural_language_affordances": ["Run an explicit TIAF sequence name."],
        "allowlisted_parameter_surfaces": ["sequence_name", "platforms", "shard_count"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.visual.diff": {
        "capability_maturity": "hybrid-read-only",
        "planner_intent_aliases": ["visual diff", "compare screenshots", "image diff"],
        "natural_language_affordances": ["Compare an explicit baseline artifact id against a candidate artifact id."],
        "allowlisted_parameter_surfaces": ["baseline_artifact_id", "candidate_artifact_id", "threshold"],
        "real_adapter_availability": True,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
}


class CapabilityRegistryService:
    def list_capabilities(self) -> list[PromptCapabilityEntry]:
        entries: list[PromptCapabilityEntry] = []
        for policy in policy_service.list_policies():
            metadata = _CAPABILITY_METADATA.get(policy.tool, {})
            entries.append(
                PromptCapabilityEntry(
                    tool_name=policy.tool,
                    agent_family=policy.agent,
                    args_schema=policy.args_schema,
                    result_schema=policy.result_schema,
                    persisted_execution_details_schema=schema_validation_service.get_persisted_schema_ref(
                        tool_name=policy.tool,
                        schema_kind="execution-details",
                    ),
                    persisted_artifact_metadata_schema=schema_validation_service.get_persisted_schema_ref(
                        tool_name=policy.tool,
                        schema_kind="artifact-metadata",
                    ),
                    approval_class=policy.approval_class,
                    default_locks=policy.required_locks,
                    capability_maturity=metadata.get("capability_maturity", "simulated-only"),
                    capability_status=policy.capability_status,
                    real_admission_stage=policy.real_admission_stage,
                    planner_intent_aliases=metadata.get("planner_intent_aliases", []),
                    natural_language_affordances=metadata.get("natural_language_affordances", []),
                    allowlisted_parameter_surfaces=metadata.get("allowlisted_parameter_surfaces", []),
                    safety_envelope=_default_safety_envelope_for_tool(policy.tool),
                    real_adapter_availability=bool(metadata.get("real_adapter_availability", False)),
                    dry_run_availability=bool(metadata.get("dry_run_availability", True)),
                    simulation_fallback_availability=bool(
                        metadata.get("simulation_fallback_availability", True)
                    ),
                )
            )
        return sorted(entries, key=lambda entry: (entry.agent_family, entry.tool_name))

    def get_capability(self, tool_name: str) -> PromptCapabilityEntry | None:
        for capability in self.list_capabilities():
            if capability.tool_name == tool_name:
                return capability
        return None

    def list_capabilities_response(self) -> PromptCapabilitiesResponse:
        return PromptCapabilitiesResponse(capabilities=self.list_capabilities())


capability_registry_service = CapabilityRegistryService()
