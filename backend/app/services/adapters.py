import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.models.api import AdapterFamilyStatus, AdapterModeStatus, AdaptersResponse
from app.models.response_envelope import DispatchResult
from app.services.catalog import catalog_service

SUPPORTED_ADAPTER_MODES = {"hybrid", "simulated"}
ADAPTER_CONTRACT_VERSION = "v0.1"
REAL_TOOL_PATHS_BY_MODE = {
    "simulated": [],
    "hybrid": ["project.inspect"],
}
PLAN_ONLY_TOOL_PATHS_BY_MODE = {
    "simulated": [],
    "hybrid": ["build.configure"],
}
ADAPTER_EXECUTION_BOUNDARY = (
    "Control-plane bookkeeping is real, but O3DE tool execution remains simulated."
)
HYBRID_EXECUTION_BOUNDARY = (
    "Control-plane bookkeeping is real. In hybrid mode, project.inspect may use a "
    "real read-only project-manifest path, build.configure may use a real plan-only "
    "preflight path, and all other tools remain simulated."
)
MANIFEST_SETTINGS_KEYS = (
    "project_id",
    "project_name",
    "display_name",
    "version",
    "summary",
    "compatible_engines",
    "engine_api_dependencies",
    "origin",
    "user_tags",
    "icon_path",
    "restricted_platform_name",
)
MANIFEST_PROJECT_CONFIG_KEYS = (
    "project_id",
    "project_name",
    "display_name",
    "version",
    "summary",
    "compatible_engines",
    "engine_api_dependencies",
    "origin",
    "user_tags",
    "icon_path",
    "restricted_platform_name",
)


@dataclass(slots=True)
class AdapterExecutionReport:
    execution_mode: str
    result: DispatchResult
    warnings: list[str]
    logs: list[str]
    artifact_label: str
    artifact_kind: str
    artifact_uri: str
    artifact_metadata: dict[str, Any]
    execution_details: dict[str, Any]
    result_summary: str


class AdapterConfigurationError(RuntimeError):
    pass


class ToolExecutionAdapter(ABC):
    def __init__(self, *, family: str, mode: str) -> None:
        self.family = family
        self.mode = mode

    @abstractmethod
    def execute(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        raise NotImplementedError


class SimulatedToolExecutionAdapter(ToolExecutionAdapter):
    def execute(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        result = DispatchResult(
            status="simulated_success",
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            simulated=True,
            execution_mode="simulated",
            approval_class=approval_class,
            locks_acquired=locks_acquired,
            message=(
                "Control-plane prechecks passed and the run was recorded, "
                "but no real O3DE adapter was executed."
            ),
        )
        return AdapterExecutionReport(
            execution_mode="simulated",
            result=result,
            warnings=[
                "Execution mode is simulated until real O3DE adapters are implemented.",
            ],
            logs=[
                "Simulated adapter execution completed successfully.",
                "No real O3DE adapter was invoked.",
            ],
            artifact_label="Simulated dispatch summary",
            artifact_kind="simulated_result",
            artifact_uri="simulated://runs/{run_id}/executions/{execution_id}/summary",
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "simulated",
                "simulated": True,
                "adapter_family": self.family,
                "adapter_mode": self.mode,
                "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
                "execution_boundary": ADAPTER_EXECUTION_BOUNDARY,
                **(
                    {"inspection_surface": "simulated"}
                    if tool
                    in {
                        "editor.component.add",
                        "editor.entity.create",
                        "editor.level.open",
                        "editor.session.open",
                        "asset.batch.process",
                        "asset.move.safe",
                        "asset.processor.status",
                        "asset.source.inspect",
                        "render.capture.viewport",
                        "render.material.inspect",
                        "render.material.patch",
                        "render.shader.rebuild",
                        "test.visual.diff",
                        "test.run.editor_python",
                        "test.run.gtest",
                        "test.tiaf.sequence",
                        "project.inspect",
                        "build.configure",
                        "settings.patch",
                        "gem.enable",
                        "build.compile",
                    }
                    else {}
                ),
            },
            execution_details={
                "simulated": True,
                "adapter_mode": "simulated",
                "adapter_family": self.family,
                "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
                "execution_boundary": ADAPTER_EXECUTION_BOUNDARY,
                **(
                    {"inspection_surface": "simulated"}
                    if tool
                    in {
                        "editor.component.add",
                        "editor.entity.create",
                        "editor.level.open",
                        "editor.session.open",
                        "asset.batch.process",
                        "asset.move.safe",
                        "asset.processor.status",
                        "asset.source.inspect",
                        "render.capture.viewport",
                        "render.material.inspect",
                        "render.material.patch",
                        "render.shader.rebuild",
                        "test.visual.diff",
                        "test.run.editor_python",
                        "test.run.gtest",
                        "test.tiaf.sequence",
                        "project.inspect",
                        "build.configure",
                        "settings.patch",
                        "gem.enable",
                        "build.compile",
                    }
                    else {}
                ),
            },
            result_summary="Simulated dispatch completed successfully.",
        )


class ProjectBuildHybridAdapter(ToolExecutionAdapter):
    def __init__(self, *, family: str, mode: str) -> None:
        super().__init__(family=family, mode=mode)
        self._simulated = SimulatedToolExecutionAdapter(family=family, mode=mode)

    def execute(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        if tool == "project.inspect":
            return self._execute_project_inspect(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
            )
        if tool == "build.configure":
            return self._execute_build_configure(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
            )
        simulated = self._simulated.execute(
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            args=args,
            approval_class=approval_class,
            locks_acquired=locks_acquired,
        )
        simulated.warnings.append(
            "Hybrid adapter mode is active, but this tool still runs through the "
            "simulated path in this phase."
        )
        simulated.logs.append(
            "Hybrid mode did not change execution for this tool; simulated adapter "
            "path remained in use."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        return simulated

    def _execute_project_inspect(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        manifest_path = Path(project_root).expanduser().resolve() / "project.json"
        if not manifest_path.is_file():
            return self._fallback_project_inspect(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real project inspection was unavailable because "
                    f"'{manifest_path}' was not found."
                ),
            )

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return self._fallback_project_inspect(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real project inspection was unavailable because the project "
                    f"manifest could not be read cleanly: {exc}"
                ),
            )

        project_name = manifest.get("project_name")
        enabled_gems = self._normalized_string_list(manifest.get("gem_names"))
        inspection_flags = {
            "include_project_config": bool(args.get("include_project_config", False)),
            "include_gems": bool(args.get("include_gems", False)),
            "include_settings": bool(args.get("include_settings", False)),
            "include_build_state": bool(args.get("include_build_state", False)),
        }
        manifest_keys = sorted(str(key) for key in manifest.keys())
        inspection_evidence: list[str] = ["project_manifest"]
        project_config_keys = self._normalized_string_list(args.get("project_config_keys"))
        project_config = self._project_config_snapshot(
            manifest,
            requested_keys=project_config_keys,
            include_project_config=inspection_flags["include_project_config"],
        )
        matched_requested_project_config_keys = (
            [key for key in project_config_keys if key in project_config]
            if inspection_flags["include_project_config"]
            else []
        )
        missing_requested_project_config_keys = (
            [key for key in project_config_keys if key not in project_config]
            if inspection_flags["include_project_config"]
            else []
        )
        requested_settings_keys = self._normalized_string_list(args.get("requested_settings_keys"))
        manifest_settings = self._manifest_settings_snapshot(
            manifest,
            requested_keys=requested_settings_keys,
            include_settings=inspection_flags["include_settings"],
        )
        matched_requested_settings_keys = (
            [key for key in requested_settings_keys if key in manifest_settings]
            if inspection_flags["include_settings"]
            else []
        )
        missing_requested_settings_keys = (
            [key for key in requested_settings_keys if key not in manifest_settings]
            if inspection_flags["include_settings"]
            else []
        )
        requested_gem_names = self._normalized_string_list(args.get("requested_gem_names"))
        matched_requested_gem_names = (
            [gem_name for gem_name in requested_gem_names if gem_name in enabled_gems]
            if inspection_flags["include_gems"]
            else []
        )
        missing_requested_gem_names = (
            [gem_name for gem_name in requested_gem_names if gem_name not in enabled_gems]
            if inspection_flags["include_gems"]
            else []
        )
        requested_gem_evidence = (
            ["gem_names", "gem_names_count"] if inspection_flags["include_gems"] else []
        )
        if inspection_flags["include_gems"] and requested_gem_names:
            requested_gem_evidence.extend(
                [
                    "requested_gem_names",
                    "matched_requested_gem_names",
                    "missing_requested_gem_names",
                ]
            )
        requested_project_config_evidence = (
            ["project_config", "project_config_keys"]
            if inspection_flags["include_project_config"]
            else []
        )
        if inspection_flags["include_project_config"] and project_config_keys:
            requested_project_config_evidence.extend(
                [
                    "requested_project_config_keys",
                    "matched_requested_project_config_keys",
                    "missing_requested_project_config_keys",
                ]
            )
        requested_settings_evidence = (
            ["manifest_settings", "manifest_settings_keys"]
            if inspection_flags["include_settings"]
            else []
        )
        if inspection_flags["include_settings"] and requested_settings_keys:
            requested_settings_evidence.extend(
                [
                    "requested_settings_keys",
                    "matched_requested_settings_keys",
                    "missing_requested_settings_keys",
                ]
            )
        message = "Read-only project manifest inspection completed against real project files."
        if isinstance(project_name, str) and project_name.strip():
            message = (
                "Read-only project manifest inspection completed against real project "
                f"files for '{project_name}'."
            )
        if inspection_flags["include_project_config"]:
            message += (
                " Manifest-backed project-config evidence was captured."
                if not project_config_keys
                else " Manifest-backed project-config evidence was captured for the "
                "requested subset contract."
            )
            inspection_evidence.append("project_config")
        if inspection_flags["include_gems"]:
            message += (
                " Manifest-backed Gem inspection evidence was captured"
                if not requested_gem_names
                else " Manifest-backed Gem inspection evidence was captured for the "
                "requested subset contract"
            )
            message += "."
            inspection_evidence.append("gem_names")
        if inspection_flags["include_settings"]:
            message += (
                " Manifest-backed settings inspection evidence was captured."
                if not requested_settings_keys
                else " Manifest-backed settings inspection evidence was captured for "
                "the requested subset contract."
            )
            inspection_evidence.append("manifest_settings")

        warnings: list[str] = []
        if inspection_flags["include_project_config"]:
            warnings.append(
                "Project-config inspection remains limited to manifest-backed top-level "
                "fields from project.json in this slice."
            )
            if not project_config:
                warnings.append(
                    "No manifest-backed project-config fields were present for the current "
                    "inspection request."
                )
        if (
            inspection_flags["include_project_config"]
            and project_config_keys
            and not matched_requested_project_config_keys
        ):
            warnings.append(
                "None of the requested_project_config_keys matched manifest-backed "
                "project-config fields for the current inspection request."
            )
        if (
            inspection_flags["include_project_config"]
            and missing_requested_project_config_keys
        ):
            warnings.append(
                "Some requested_project_config_keys were not present in manifest-backed "
                f"project-config fields: {', '.join(missing_requested_project_config_keys)}."
            )
        if inspection_flags["include_settings"]:
            warnings.append(
                "Settings inspection remains limited to manifest-backed top-level "
                "project settings in this slice."
            )
            if not manifest_settings:
                warnings.append(
                    "No manifest-backed settings fields were present for the current "
                    "inspection request."
                )
        if (
            inspection_flags["include_settings"]
            and requested_settings_keys
            and not matched_requested_settings_keys
        ):
            warnings.append(
                "None of the requested_settings_keys matched manifest-backed settings "
                "fields for the current inspection request."
            )
        if inspection_flags["include_settings"] and missing_requested_settings_keys:
            warnings.append(
                "Some requested_settings_keys were not present in manifest-backed "
                f"settings fields: {', '.join(missing_requested_settings_keys)}."
            )
        if inspection_flags["include_gems"] and not enabled_gems:
            warnings.append(
                "No gem_names entries were present for the current inspection request."
            )
        if (
            inspection_flags["include_gems"]
            and requested_gem_names
            and not matched_requested_gem_names
        ):
            warnings.append(
                "None of the requested_gem_names matched manifest-backed gem_names entries "
                "for the current inspection request."
            )
        if inspection_flags["include_gems"] and missing_requested_gem_names:
            warnings.append(
                "Some requested_gem_names were not present in manifest-backed gem_names "
                f"entries: {', '.join(missing_requested_gem_names)}."
            )
        if inspection_flags["include_build_state"]:
            warnings.append(
                "Build-state inspection remains simulated in this slice even when the "
                "project manifest path is real."
            )

        result = DispatchResult(
            status="real_success",
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            simulated=False,
            execution_mode="real",
            approval_class=approval_class,
            locks_acquired=locks_acquired,
            message=message,
        )
        return AdapterExecutionReport(
            execution_mode="real",
            result=result,
            warnings=warnings,
            logs=[
                "Hybrid adapter mode enabled a real project.inspect path.",
                f"Read project manifest from '{manifest_path}'.",
                (
                    "Captured manifest-backed project-config inspection evidence."
                    if (
                        inspection_flags["include_project_config"]
                        and project_config
                        and not project_config_keys
                    )
                    else "Captured requested project-config subset evidence with "
                    f"{len(matched_requested_project_config_keys)} matched and "
                    f"{len(missing_requested_project_config_keys)} missing requested keys."
                    if inspection_flags["include_project_config"] and project_config_keys
                    else "Project-config inspection evidence was not requested."
                    if not inspection_flags["include_project_config"]
                    else "No manifest-backed project-config evidence was available to capture."
                ),
                (
                    "Requested project-config subset matching was not requested."
                    if (
                        not inspection_flags["include_project_config"]
                        or not project_config_keys
                    )
                    else "Requested project-config subset matching resolved against "
                    "manifest-backed project-config fields with "
                    f"{len(matched_requested_project_config_keys)} matches."
                ),
                (
                    "Gem inspection evidence was not requested."
                    if not inspection_flags["include_gems"]
                    else f"Captured {len(enabled_gems)} manifest-backed Gem entries."
                    if not requested_gem_names
                    else "Captured requested Gem subset evidence with "
                    f"{len(matched_requested_gem_names)} matched and "
                    f"{len(missing_requested_gem_names)} missing requested names."
                ),
                (
                    "Requested Gem subset matching was not requested."
                    if not inspection_flags["include_gems"] or not requested_gem_names
                    else "Requested Gem subset matching resolved against manifest-backed "
                    f"gem_names with {len(matched_requested_gem_names)} matches."
                ),
                (
                    "Settings inspection evidence was not requested."
                    if not inspection_flags["include_settings"]
                    else "Captured manifest-backed top-level settings evidence."
                    if not requested_settings_keys and manifest_settings
                    else "No manifest-backed settings evidence was available to capture."
                    if not requested_settings_keys
                    else "Captured requested settings subset evidence with "
                    f"{len(matched_requested_settings_keys)} matched and "
                    f"{len(missing_requested_settings_keys)} missing requested keys."
                ),
                (
                    "Requested settings subset matching was not requested."
                    if not inspection_flags["include_settings"] or not requested_settings_keys
                    else "Requested settings subset matching resolved against manifest-backed "
                    f"settings fields with {len(matched_requested_settings_keys)} matches."
                ),
            ],
            artifact_label="Real project manifest inspection evidence",
            artifact_kind="project_manifest_inspection",
            artifact_uri=manifest_path.as_uri(),
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                "adapter_family": self.family,
                "adapter_mode": self.mode,
                "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
                "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
                "inspection_surface": "project_manifest",
                "inspection_evidence": inspection_evidence,
                "project_manifest_path": str(manifest_path),
                "manifest_keys": manifest_keys,
                "project_name": project_name,
                "include_flags": inspection_flags,
                "project_config": (
                    project_config if inspection_flags["include_project_config"] else {}
                ),
                "project_config_keys": (
                    sorted(project_config.keys())
                    if inspection_flags["include_project_config"]
                    else []
                ),
                "requested_project_config_evidence": requested_project_config_evidence,
                "project_config_selection_mode": (
                    "requested-subset"
                    if inspection_flags["include_project_config"] and project_config_keys
                    else "all-discovered"
                    if inspection_flags["include_project_config"]
                    else "not-requested"
                ),
                "requested_project_config_keys": (
                    project_config_keys if inspection_flags["include_project_config"] else []
                ),
                "matched_requested_project_config_keys": (
                    matched_requested_project_config_keys
                ),
                "missing_requested_project_config_keys": (
                    missing_requested_project_config_keys
                ),
                "requested_settings_evidence": requested_settings_evidence,
                "settings_selection_mode": (
                    "requested-subset"
                    if inspection_flags["include_settings"] and requested_settings_keys
                    else "all-discovered"
                    if inspection_flags["include_settings"]
                    else "not-requested"
                ),
                "requested_settings_keys": (
                    requested_settings_keys if inspection_flags["include_settings"] else []
                ),
                "matched_requested_settings_keys": matched_requested_settings_keys,
                "missing_requested_settings_keys": missing_requested_settings_keys,
                "requested_gem_evidence": requested_gem_evidence,
                "gem_selection_mode": (
                    "requested-subset"
                    if inspection_flags["include_gems"] and requested_gem_names
                    else "all-discovered"
                    if inspection_flags["include_gems"]
                    else "not-requested"
                ),
                "requested_gem_names": (
                    requested_gem_names if inspection_flags["include_gems"] else []
                ),
                "matched_requested_gem_names": matched_requested_gem_names,
                "missing_requested_gem_names": missing_requested_gem_names,
                "gem_names": enabled_gems if inspection_flags["include_gems"] else [],
                "gem_names_count": len(enabled_gems) if inspection_flags["include_gems"] else 0,
                "gem_entries_present": (
                    len(enabled_gems) > 0 if inspection_flags["include_gems"] else False
                ),
                "requested_gem_subset_present": (
                    len(matched_requested_gem_names) > 0
                    if inspection_flags["include_gems"] and requested_gem_names
                    else False
                ),
                "manifest_settings": (
                    manifest_settings if inspection_flags["include_settings"] else {}
                ),
                "manifest_settings_keys": (
                    sorted(manifest_settings.keys())
                    if inspection_flags["include_settings"]
                    else []
                ),
                "requested_settings_subset_present": (
                    len(matched_requested_settings_keys) > 0
                    if inspection_flags["include_settings"] and requested_settings_keys
                    else False
                ),
                "requested_project_config_subset_present": (
                    len(matched_requested_project_config_keys) > 0
                    if inspection_flags["include_project_config"] and project_config_keys
                    else False
                ),
            },
            execution_details={
                "simulated": False,
                "adapter_mode": "real",
                "adapter_family": self.family,
                "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
                "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
                "inspection_surface": "project_manifest",
                "inspection_evidence": inspection_evidence,
                "project_manifest_path": str(manifest_path),
                "manifest_keys": manifest_keys,
                "project_name": project_name,
                "include_flags": inspection_flags,
                "project_config": (
                    project_config if inspection_flags["include_project_config"] else {}
                ),
                "project_config_keys": (
                    sorted(project_config.keys())
                    if inspection_flags["include_project_config"]
                    else []
                ),
                "requested_project_config_evidence": requested_project_config_evidence,
                "project_config_selection_mode": (
                    "requested-subset"
                    if inspection_flags["include_project_config"] and project_config_keys
                    else "all-discovered"
                    if inspection_flags["include_project_config"]
                    else "not-requested"
                ),
                "requested_project_config_keys": (
                    project_config_keys if inspection_flags["include_project_config"] else []
                ),
                "matched_requested_project_config_keys": (
                    matched_requested_project_config_keys
                ),
                "missing_requested_project_config_keys": (
                    missing_requested_project_config_keys
                ),
                "requested_settings_evidence": requested_settings_evidence,
                "settings_selection_mode": (
                    "requested-subset"
                    if inspection_flags["include_settings"] and requested_settings_keys
                    else "all-discovered"
                    if inspection_flags["include_settings"]
                    else "not-requested"
                ),
                "requested_settings_keys": (
                    requested_settings_keys if inspection_flags["include_settings"] else []
                ),
                "matched_requested_settings_keys": matched_requested_settings_keys,
                "missing_requested_settings_keys": missing_requested_settings_keys,
                "requested_gem_evidence": requested_gem_evidence,
                "gem_selection_mode": (
                    "requested-subset"
                    if inspection_flags["include_gems"] and requested_gem_names
                    else "all-discovered"
                    if inspection_flags["include_gems"]
                    else "not-requested"
                ),
                "requested_gem_names": (
                    requested_gem_names if inspection_flags["include_gems"] else []
                ),
                "matched_requested_gem_names": matched_requested_gem_names,
                "missing_requested_gem_names": missing_requested_gem_names,
                "gem_names": enabled_gems if inspection_flags["include_gems"] else [],
                "gem_names_count": len(enabled_gems) if inspection_flags["include_gems"] else 0,
                "gem_entries_present": (
                    len(enabled_gems) > 0 if inspection_flags["include_gems"] else False
                ),
                "requested_gem_subset_present": (
                    len(matched_requested_gem_names) > 0
                    if inspection_flags["include_gems"] and requested_gem_names
                    else False
                ),
                "manifest_settings": (
                    manifest_settings if inspection_flags["include_settings"] else {}
                ),
                "manifest_settings_keys": (
                    sorted(manifest_settings.keys())
                    if inspection_flags["include_settings"]
                    else []
                ),
                "requested_settings_subset_present": (
                    len(matched_requested_settings_keys) > 0
                    if inspection_flags["include_settings"] and requested_settings_keys
                    else False
                ),
                "requested_project_config_subset_present": (
                    len(matched_requested_project_config_keys) > 0
                    if inspection_flags["include_project_config"] and project_config_keys
                    else False
                ),
            },
            result_summary="Real project manifest inspection completed successfully.",
        )

    def _execute_build_configure(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        if not dry_run:
            simulated = self._simulated.execute(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
            )
            simulated.warnings.append(
                "Real build.configure preflight is only available when dry_run=true; "
                "mutating configure execution remains simulated in this phase."
            )
            simulated.logs.append(
                "Hybrid mode fell back to the simulated build.configure path because "
                "the request was not dry-run."
            )
            simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
            simulated.artifact_metadata["real_path_available"] = False
            simulated.artifact_metadata["fallback_reason"] = (
                "Real build.configure preflight requires dry_run=true."
            )
            simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
            simulated.execution_details["real_path_available"] = False
            simulated.execution_details["fallback_reason"] = (
                "Real build.configure preflight requires dry_run=true."
            )
            simulated.result_summary = "build.configure fell back to the simulated path."
            return simulated

        manifest_path = Path(project_root).expanduser().resolve() / "project.json"
        if not manifest_path.is_file():
            return self._fallback_build_configure(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real build.configure preflight was unavailable because "
                    f"'{manifest_path}' was not found."
                ),
            )

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return self._fallback_build_configure(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real build.configure preflight was unavailable because the project "
                    f"manifest could not be read cleanly: {exc}"
                ),
            )

        project_name = manifest.get("project_name")
        preset = str(args.get("preset", "")).strip() or "default"
        generator = str(args.get("generator", "")).strip() or "unspecified"
        config = str(args.get("config", "")).strip() or "unspecified"
        clean_requested = bool(args.get("clean", False))
        manifest_keys = sorted(str(key) for key in manifest.keys())
        build_dir = Path(project_root).expanduser().resolve() / "build" / preset
        engine_root_exists = Path(engine_root).expanduser().resolve().exists()
        plan_details = {
            "preset": preset,
            "generator": generator,
            "config": config,
            "clean_requested": clean_requested,
            "build_directory": str(build_dir),
            "build_directory_exists": build_dir.exists(),
            "engine_root_exists": engine_root_exists,
            "project_manifest_path": str(manifest_path),
        }
        message = (
            "Real build.configure preflight completed; no configure command was executed."
        )
        if isinstance(project_name, str) and project_name.strip():
            message = (
                "Real build.configure preflight completed for "
                f"'{project_name}'; no configure command was executed."
            )

        warnings = [
            "This is a real plan-only preflight path; actual configure mutation remains gated.",
        ]
        if clean_requested:
            warnings.append(
                "The clean flag was recorded in the preflight plan only; no build tree "
                "content was removed in this slice."
            )
        if not engine_root_exists:
            warnings.append(
                "Engine root path does not currently exist; this preflight recorded the "
                "missing prerequisite instead of attempting a real configure step."
            )

        result = DispatchResult(
            status="real_success",
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            simulated=False,
            execution_mode="real",
            approval_class=approval_class,
            locks_acquired=locks_acquired,
            message=message,
        )
        return AdapterExecutionReport(
            execution_mode="real",
            result=result,
            warnings=warnings,
            logs=[
                "Hybrid adapter mode enabled a real build.configure preflight path.",
                f"Read project manifest from '{manifest_path}'.",
                f"Recorded build preflight target directory '{build_dir}'.",
            ],
            artifact_label="Real build configure preflight evidence",
            artifact_kind="build_configure_preflight",
            artifact_uri=manifest_path.as_uri(),
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                "adapter_family": self.family,
                "adapter_mode": self.mode,
                "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
                "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
                "inspection_surface": "build_configure_preflight",
                "project_manifest_path": str(manifest_path),
                "manifest_keys": manifest_keys,
                "project_name": project_name,
                "plan_details": plan_details,
            },
            execution_details={
                "simulated": False,
                "adapter_mode": "real",
                "adapter_family": self.family,
                "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
                "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
                "inspection_surface": "build_configure_preflight",
                "project_manifest_path": str(manifest_path),
                "manifest_keys": manifest_keys,
                "project_name": project_name,
                "plan_details": plan_details,
            },
            result_summary="Real build.configure preflight completed successfully.",
        )

    def _fallback_project_inspect(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
        reason: str,
    ) -> AdapterExecutionReport:
        simulated = self._simulated.execute(
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            args=args,
            approval_class=approval_class,
            locks_acquired=locks_acquired,
        )
        simulated.warnings.append(reason)
        simulated.logs.append(reason)
        simulated.logs.append(
            "Hybrid mode fell back to the simulated project.inspect path."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.artifact_metadata["real_path_available"] = False
        simulated.artifact_metadata["fallback_reason"] = reason
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["real_path_available"] = False
        simulated.execution_details["fallback_reason"] = reason
        simulated.result_summary = "Project inspection fell back to the simulated path."
        return simulated

    def _fallback_build_configure(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
        reason: str,
    ) -> AdapterExecutionReport:
        simulated = self._simulated.execute(
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            args=args,
            approval_class=approval_class,
            locks_acquired=locks_acquired,
        )
        simulated.warnings.append(reason)
        simulated.logs.append(reason)
        simulated.logs.append(
            "Hybrid mode fell back to the simulated build.configure path."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.artifact_metadata["real_path_available"] = False
        simulated.artifact_metadata["fallback_reason"] = reason
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["real_path_available"] = False
        simulated.execution_details["fallback_reason"] = reason
        simulated.result_summary = "build.configure fell back to the simulated path."
        return simulated

    def _normalized_string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        normalized: list[str] = []
        for entry in value:
            if isinstance(entry, str):
                candidate = entry.strip()
                if candidate:
                    normalized.append(candidate)
        return normalized

    def _manifest_settings_snapshot(
        self,
        manifest: dict[str, Any],
        *,
        requested_keys: list[str],
        include_settings: bool,
    ) -> dict[str, Any]:
        if not include_settings:
            return {}

        allowed_keys = set(MANIFEST_SETTINGS_KEYS)
        selected_keys = [
            key for key in requested_keys if key in allowed_keys
        ] or [key for key in MANIFEST_SETTINGS_KEYS if key in manifest]

        snapshot: dict[str, Any] = {}
        for key in selected_keys:
            if key in manifest:
                snapshot[key] = manifest[key]
        return snapshot

    def _project_config_snapshot(
        self,
        manifest: dict[str, Any],
        *,
        requested_keys: list[str],
        include_project_config: bool,
    ) -> dict[str, Any]:
        if not include_project_config:
            return {}

        allowed_keys = set(MANIFEST_PROJECT_CONFIG_KEYS)
        selected_keys = [
            key for key in requested_keys if key in allowed_keys
        ] or [key for key in MANIFEST_PROJECT_CONFIG_KEYS if key in manifest]

        snapshot: dict[str, Any] = {}
        for key in selected_keys:
            if key in manifest:
                snapshot[key] = manifest[key]
        return snapshot


class AdapterService:
    def _real_tool_paths_for_mode(self, active_mode: str) -> list[str]:
        return list(REAL_TOOL_PATHS_BY_MODE.get(active_mode, []))

    def _plan_only_tool_paths_for_mode(self, active_mode: str) -> list[str]:
        return list(PLAN_ONLY_TOOL_PATHS_BY_MODE.get(active_mode, []))

    def _simulated_tool_paths_for_family(
        self,
        *,
        family: str,
        active_mode: str,
    ) -> list[str]:
        tool_names = sorted(
            tool.name
            for agent in catalog_service.get_catalog_model().agents
            if agent.id == family
            for tool in agent.tools
        )
        family_real = set()
        family_plan_only = set()
        if active_mode == "hybrid" and family == "project-build":
            family_real = set(self._real_tool_paths_for_mode(active_mode))
            family_plan_only = set(self._plan_only_tool_paths_for_mode(active_mode))
        return sorted(
            tool_name
            for tool_name in tool_names
            if tool_name not in family_real and tool_name not in family_plan_only
        )

    def _configured_mode(self) -> str:
        return os.getenv("O3DE_ADAPTER_MODE", "simulated").strip().lower() or "simulated"

    def _registry(self) -> dict[str, ToolExecutionAdapter]:
        configured_mode = self._configured_mode()
        if configured_mode not in SUPPORTED_ADAPTER_MODES:
            return {}
        registry: dict[str, ToolExecutionAdapter] = {}
        for agent in catalog_service.get_catalog_model().agents:
            if configured_mode == "hybrid" and agent.id == "project-build":
                registry[agent.id] = ProjectBuildHybridAdapter(
                    family=agent.id,
                    mode=configured_mode,
                )
            else:
                registry[agent.id] = SimulatedToolExecutionAdapter(
                    family=agent.id,
                    mode=configured_mode,
                )
        return registry

    def get_runtime_status(self) -> AdapterModeStatus:
        configured_mode = self._configured_mode()
        registry = self._registry()
        available_families = sorted(registry.keys())
        if configured_mode not in SUPPORTED_ADAPTER_MODES:
            return AdapterModeStatus(
                ready=False,
                configured_mode=configured_mode,
                active_mode="unavailable",
                supports_real_execution=False,
                contract_version=ADAPTER_CONTRACT_VERSION,
                execution_boundary=ADAPTER_EXECUTION_BOUNDARY,
                supported_modes=sorted(SUPPORTED_ADAPTER_MODES),
                available_families=available_families,
                real_tool_paths=[],
                plan_only_tool_paths=[],
                simulated_tool_paths=[],
                warning=(
                    f"Configured adapter mode '{configured_mode}' is not supported; "
                    "only 'simulated' and 'hybrid' are currently available."
                ),
                notes=[
                    "Adapter mode selection is now config-driven.",
                    "Real O3DE adapters are not yet implemented.",
                    "Hybrid mode currently enables a real read-only project.inspect "
                    "path and a real plan-only build.configure preflight path.",
                ],
            )
        if configured_mode == "hybrid":
            real_tool_paths = self._real_tool_paths_for_mode("hybrid")
            plan_only_tool_paths = self._plan_only_tool_paths_for_mode("hybrid")
            simulated_tool_paths = sorted(
                tool.name
                for agent in catalog_service.get_catalog_model().agents
                for tool in agent.tools
                if tool.name not in real_tool_paths and tool.name not in plan_only_tool_paths
            )
            return AdapterModeStatus(
                ready=True,
                configured_mode=configured_mode,
                active_mode="hybrid",
                supports_real_execution=True,
                contract_version=ADAPTER_CONTRACT_VERSION,
                execution_boundary=HYBRID_EXECUTION_BOUNDARY,
                supported_modes=sorted(SUPPORTED_ADAPTER_MODES),
                available_families=available_families,
                real_tool_paths=real_tool_paths,
                plan_only_tool_paths=plan_only_tool_paths,
                simulated_tool_paths=simulated_tool_paths,
                warning=None,
                notes=[
                    "Adapter mode selection is now config-driven.",
                    "Hybrid mode enables a real read-only project.inspect path when its "
                    "manifest preconditions are satisfied.",
                    "Hybrid mode also enables a real plan-only build.configure "
                    "preflight path when dry_run=true and manifest preconditions are "
                    "satisfied.",
                    "All other tools remain simulated in this phase.",
                    "Real mutating O3DE adapters are not yet implemented.",
                ],
            )
        return AdapterModeStatus(
            ready=True,
            configured_mode=configured_mode,
            active_mode="simulated",
            supports_real_execution=False,
            contract_version=ADAPTER_CONTRACT_VERSION,
            execution_boundary=ADAPTER_EXECUTION_BOUNDARY,
            supported_modes=sorted(SUPPORTED_ADAPTER_MODES),
            available_families=available_families,
            real_tool_paths=[],
            plan_only_tool_paths=[],
            simulated_tool_paths=sorted(
                tool.name
                for agent in catalog_service.get_catalog_model().agents
                for tool in agent.tools
            ),
            warning=None,
            notes=[
                "Adapter mode selection is now config-driven.",
                "Real O3DE adapters are not yet implemented.",
                "Simulated execution remains the default adapter mode in this phase.",
            ],
        )

    def execute(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        runtime_status = self.get_runtime_status()
        if not runtime_status.ready:
            raise AdapterConfigurationError(runtime_status.warning or "Adapter mode is not ready.")
        adapter = self._registry().get(agent)
        if adapter is None:
            raise AdapterConfigurationError(
                "No adapter is registered for agent family "
                f"'{agent}' in mode '{runtime_status.active_mode}'."
            )
        return adapter.execute(
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            args=args,
            approval_class=approval_class,
            locks_acquired=locks_acquired,
        )

    def list_adapters(self) -> AdaptersResponse:
        runtime_status = self.get_runtime_status()
        families: list[AdapterFamilyStatus] = []
        for family in runtime_status.available_families:
            family_supports_real = (
                runtime_status.active_mode == "hybrid" and family == "project-build"
            )
            family_real_tool_paths = (
                list(runtime_status.real_tool_paths)
                if family_supports_real
                else []
            )
            family_plan_only_tool_paths = (
                list(runtime_status.plan_only_tool_paths)
                if family_supports_real
                else []
            )
            family_simulated_tool_paths = self._simulated_tool_paths_for_family(
                family=family,
                active_mode=runtime_status.active_mode,
            )
            family_notes = list(runtime_status.notes)
            if family_supports_real:
                family_notes.append(
                    "project.inspect currently has a real read-only path and "
                    "build.configure currently has a real plan-only preflight path "
                    "in this family."
                )
            elif runtime_status.active_mode == "hybrid":
                family_notes.append(
                    "This family remains simulated even while hybrid mode is active."
                )
            families.append(
                AdapterFamilyStatus(
                    family=family,
                    mode=runtime_status.active_mode,
                    supports_real_execution=family_supports_real,
                    contract_version=runtime_status.contract_version,
                    execution_boundary=runtime_status.execution_boundary,
                    ready=runtime_status.ready,
                    real_tool_paths=family_real_tool_paths,
                    plan_only_tool_paths=family_plan_only_tool_paths,
                    simulated_tool_paths=family_simulated_tool_paths,
                    notes=family_notes,
                )
            )
        return AdaptersResponse(
            configured_mode=runtime_status.configured_mode,
            active_mode=runtime_status.active_mode,
            supported_modes=runtime_status.supported_modes,
            contract_version=runtime_status.contract_version,
            supports_real_execution=runtime_status.supports_real_execution,
            real_tool_paths=runtime_status.real_tool_paths,
            plan_only_tool_paths=runtime_status.plan_only_tool_paths,
            simulated_tool_paths=runtime_status.simulated_tool_paths,
            families=families,
            warning=runtime_status.warning,
            notes=runtime_status.notes,
        )


adapter_service = AdapterService()
