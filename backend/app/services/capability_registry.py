from __future__ import annotations

from typing import Any

from app.models.prompt_control import PromptCapabilitiesResponse, PromptCapabilityEntry
from app.services.policy import policy_service
from app.services.schema_validation import schema_validation_service


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
        "capability_maturity": "runtime-reaching",
        "planner_intent_aliases": ["create entity", "spawn entity", "add entity"],
        "natural_language_affordances": [
            "Reach the typed root-level entity creation runtime boundary with explicit level targeting, while live admission remains narrowed until the real editor path is stable."
        ],
        "allowlisted_parameter_surfaces": ["entity_name", "level_path"],
        "real_adapter_availability": True,
        "dry_run_availability": False,
        "simulation_fallback_availability": False,
    },
    "editor.component.add": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["add component", "attach component", "component on entity"],
        "natural_language_affordances": ["Attach explicit components to an explicit entity id."],
        "allowlisted_parameter_surfaces": ["entity_id", "components", "level_path"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "asset.processor.status": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["asset processor status", "asset status", "asset processor"],
        "natural_language_affordances": ["Inspect Asset Processor runtime state."],
        "allowlisted_parameter_surfaces": ["include_jobs", "include_platforms"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "asset.source.inspect": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["inspect asset", "source asset", "asset metadata"],
        "natural_language_affordances": ["Inspect a source asset by explicit path."],
        "allowlisted_parameter_surfaces": ["source_path", "include_products", "include_dependencies"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "asset.batch.process": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["process assets", "asset batch", "asset pipeline batch"],
        "natural_language_affordances": ["Run a typed asset batch process request."],
        "allowlisted_parameter_surfaces": ["source_glob", "platforms", "clean", "max_jobs"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "asset.move.safe": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["move asset", "rename asset", "relocate asset"],
        "natural_language_affordances": ["Plan or execute a guarded asset move with explicit source and destination."],
        "allowlisted_parameter_surfaces": ["source_path", "destination_path", "update_references", "dry_run_plan"],
        "real_adapter_availability": False,
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
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["enable gem", "add gem"],
        "natural_language_affordances": ["Enable a named Gem for the current project."],
        "allowlisted_parameter_surfaces": ["gem_name", "version", "optional"],
        "real_adapter_availability": False,
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
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["compile target", "build target", "compile project"],
        "natural_language_affordances": ["Compile explicit named targets through a typed build request."],
        "allowlisted_parameter_surfaces": ["targets", "config", "parallel_jobs"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.material.inspect": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["inspect material", "show material", "material details"],
        "natural_language_affordances": ["Inspect a material by explicit material path."],
        "allowlisted_parameter_surfaces": ["material_path", "include_shader_data", "include_references"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.material.patch": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["patch material", "set material", "update material property"],
        "natural_language_affordances": ["Apply an explicit material property override map to a material path."],
        "allowlisted_parameter_surfaces": ["material_path", "property_overrides", "create_backup"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.shader.rebuild": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["rebuild shader", "recompile shader"],
        "natural_language_affordances": ["Request a typed shader rebuild."],
        "allowlisted_parameter_surfaces": ["shader_targets", "platforms", "force"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "render.capture.viewport": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["capture viewport", "viewport screenshot", "take screenshot"],
        "natural_language_affordances": ["Capture a viewport image with an optional camera and resolution."],
        "allowlisted_parameter_surfaces": ["output_label", "camera_entity_id", "resolution"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.run.gtest": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["run gtest", "native test", "gtest target"],
        "natural_language_affordances": ["Run explicit native test targets."],
        "allowlisted_parameter_surfaces": ["test_targets", "filter", "timeout_s"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.run.editor_python": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["run editor python test", "editor python module", "editor python validation"],
        "natural_language_affordances": ["Run explicit editor Python test modules."],
        "allowlisted_parameter_surfaces": ["test_modules", "editor_args", "timeout_s"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.tiaf.sequence": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["run tiaf", "tiaf sequence", "test impact analysis"],
        "natural_language_affordances": ["Run an explicit TIAF sequence name."],
        "allowlisted_parameter_surfaces": ["sequence_name", "platforms", "shard_count"],
        "real_adapter_availability": False,
        "dry_run_availability": True,
        "simulation_fallback_availability": True,
    },
    "test.visual.diff": {
        "capability_maturity": "simulated-only",
        "planner_intent_aliases": ["visual diff", "compare screenshots", "image diff"],
        "natural_language_affordances": ["Compare an explicit baseline artifact id against a candidate artifact id."],
        "allowlisted_parameter_surfaces": ["baseline_artifact_id", "candidate_artifact_id", "threshold"],
        "real_adapter_availability": False,
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
