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
    "hybrid": ["build.configure", "settings.patch"],
}
ADAPTER_EXECUTION_BOUNDARY = (
    "Control-plane bookkeeping is real, but O3DE tool execution remains simulated."
)
HYBRID_EXECUTION_BOUNDARY = (
    "Control-plane bookkeeping is real. In hybrid mode, project.inspect may use a "
    "real read-only project-manifest path, build.configure may use a real plan-only "
    "preflight path, settings.patch may use a real dry-run-only preflight path, "
    "and all other tools remain simulated."
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


class AdapterExecutionRejected(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
        warnings: list[str] | None = None,
        logs: list[str] | None = None,
    ) -> None:
        super().__init__(message)
        self.details = details or {}
        self.warnings = warnings or []
        self.logs = logs or []


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
        if tool == "settings.patch":
            return self._execute_settings_patch(
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
        available_project_config = self._project_config_snapshot(
            manifest,
            requested_keys=[],
            include_project_config=inspection_flags["include_project_config"],
        )
        available_project_config_keys = (
            sorted(available_project_config.keys())
            if inspection_flags["include_project_config"]
            else []
        )
        available_project_config_count = (
            len(available_project_config_keys)
            if inspection_flags["include_project_config"]
            else 0
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
        matched_requested_project_config_count = (
            len(matched_requested_project_config_keys)
            if inspection_flags["include_project_config"]
            else 0
        )
        missing_requested_project_config_count = (
            len(missing_requested_project_config_keys)
            if inspection_flags["include_project_config"]
            else 0
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
        matched_requested_gem_count = (
            len(matched_requested_gem_names)
            if inspection_flags["include_gems"]
            else 0
        )
        missing_requested_gem_count = (
            len(missing_requested_gem_names)
            if inspection_flags["include_gems"]
            else 0
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
        matched_requested_settings_count = (
            len(matched_requested_settings_keys)
            if inspection_flags["include_settings"]
            else 0
        )
        missing_requested_settings_count = (
            len(missing_requested_settings_keys)
            if inspection_flags["include_settings"]
            else 0
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
                "available_project_config_keys": available_project_config_keys,
                "available_project_config_count": available_project_config_count,
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
                "matched_requested_project_config_count": (
                    matched_requested_project_config_count
                ),
                "missing_requested_project_config_count": (
                    missing_requested_project_config_count
                ),
                "project_config_fields_present": (
                    len(project_config) > 0
                    if inspection_flags["include_project_config"]
                    else False
                ),
                "requested_settings_evidence": requested_settings_evidence,
                "settings_evidence_source": (
                    "project_manifest_top_level"
                    if inspection_flags["include_settings"]
                    else "not-requested"
                ),
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
                "matched_requested_settings_count": matched_requested_settings_count,
                "missing_requested_settings_count": missing_requested_settings_count,
                "requested_gem_evidence": requested_gem_evidence,
                "gem_evidence_source": (
                    "project_manifest_gem_names"
                    if inspection_flags["include_gems"]
                    else "not-requested"
                ),
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
                "matched_requested_gem_count": matched_requested_gem_count,
                "missing_requested_gem_count": missing_requested_gem_count,
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
                "available_project_config_keys": available_project_config_keys,
                "available_project_config_count": available_project_config_count,
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
                "matched_requested_project_config_count": (
                    matched_requested_project_config_count
                ),
                "missing_requested_project_config_count": (
                    missing_requested_project_config_count
                ),
                "project_config_fields_present": (
                    len(project_config) > 0
                    if inspection_flags["include_project_config"]
                    else False
                ),
                "requested_settings_evidence": requested_settings_evidence,
                "settings_evidence_source": (
                    "project_manifest_top_level"
                    if inspection_flags["include_settings"]
                    else "not-requested"
                ),
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
                "matched_requested_settings_count": matched_requested_settings_count,
                "missing_requested_settings_count": missing_requested_settings_count,
                "requested_gem_evidence": requested_gem_evidence,
                "gem_evidence_source": (
                    "project_manifest_gem_names"
                    if inspection_flags["include_gems"]
                    else "not-requested"
                ),
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
                "matched_requested_gem_count": matched_requested_gem_count,
                "missing_requested_gem_count": missing_requested_gem_count,
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

    def _execute_settings_patch(
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
            return self._fallback_settings_patch(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real settings.patch preflight was unavailable because "
                    f"'{manifest_path}' was not found."
                ),
            )

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return self._fallback_settings_patch(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real settings.patch preflight was unavailable because the project "
                    f"manifest could not be read cleanly: {exc}"
                ),
            )

        project_name = manifest.get("project_name")
        registry_path = str(args.get("registry_path", "")).strip() or "/O3DE/Settings"
        operations = args.get("operations")
        normalized_operations = operations if isinstance(operations, list) else []
        admitted_manifest_paths = [f"/{key}" for key in MANIFEST_SETTINGS_KEYS]
        supported_operations = [
            operation
            for operation in normalized_operations
            if isinstance(operation, dict)
            and str(operation.get("op", "")).strip() == "set"
            and str(operation.get("path", "")).strip() in admitted_manifest_paths
        ]
        unsupported_operations = [
            operation
            for operation in normalized_operations
            if operation not in supported_operations
        ]
        registry_path_admitted = registry_path == "/O3DE/Settings"
        supported_operation_paths = sorted(
            {
                str(operation.get("path", "")).strip()
                for operation in supported_operations
                if isinstance(operation, dict)
            }
        )
        unsupported_operation_paths = sorted(
            {
                str(operation.get("path", "")).strip()
                for operation in unsupported_operations
                if isinstance(operation, dict)
            }
        )
        if not dry_run and (
            not registry_path_admitted
            or len(supported_operations) == 0
            or len(unsupported_operations) > 0
        ):
            return self._fallback_settings_patch(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real settings.patch mutation remains limited to the fully admitted "
                    "manifest-backed set-only path in this slice."
                ),
            )
        backup_target = manifest_path.with_suffix(f"{manifest_path.suffix}.bak")
        backup_source_path = str(manifest_path)
        backup_created = False
        backup_error: str | None = None
        if registry_path_admitted and supported_operations:
            try:
                backup_target.write_text(
                    manifest_path.read_text(encoding="utf-8"),
                    encoding="utf-8",
                )
                backup_created = True
            except OSError as exc:
                backup_error = str(exc)
                raise AdapterExecutionRejected(
                    "Real settings.patch preflight was rejected because the backup file "
                    "could not be created before any mutation-capable step.",
                    details={
                        "inspection_surface": "settings_patch_preflight",
                        "project_manifest_path": str(manifest_path),
                        "backup_target": str(backup_target),
                        "backup_created": False,
                        "backup_error": backup_error,
                        "registry_path": registry_path,
                        "operation_count": len(normalized_operations),
                        "supported_operation_count": len(supported_operations),
                        "unsupported_operation_count": len(unsupported_operations),
                        "supported_operation_paths": supported_operation_paths,
                        "unsupported_operation_paths": unsupported_operation_paths,
                    },
                    warnings=[
                        "settings.patch preflight was rejected before mutation because "
                        "the backup file could not be created."
                    ],
                    logs=[
                        "Hybrid adapter mode enabled a real settings.patch preflight path.",
                        f"Read project manifest from '{manifest_path}'.",
                        f"Backup creation failed for '{backup_target}': {backup_error}",
                    ],
                ) from exc
        rollback_strategy = "restore-project-manifest-backup"
        rollback_ready = backup_created
        patch_plan_valid = (
            registry_path_admitted
            and backup_created
            and len(supported_operations) > 0
            and len(unsupported_operations) == 0
        )
        mutation_applied = patch_plan_valid and not dry_run
        mutation_ready = patch_plan_valid
        mutation_blocked = patch_plan_valid and dry_run
        mutation_blocked_reason = (
            "Validated mutation-ready settings.patch plan remains intentionally "
            "write-disabled in this slice."
            if mutation_blocked
            else None
        )
        rollback_attempted = False
        rollback_succeeded = False
        rollback_outcome: str | None = None
        rollback_trigger: str | None = None
        rollback_verification_attempted = False
        rollback_verification_succeeded = False
        rollback_verification_error: str | None = None
        applied_operation_count = 0
        post_write_verification_attempted = False
        post_write_verification_succeeded = False
        verified_operation_paths: list[str] = []
        verification_mismatched_paths: list[str] = []
        verification_error: str | None = None

        def _build_mutation_audit(
            *,
            phase: str,
            status: str,
            summary: str,
            include_verification_paths: bool = False,
        ) -> dict[str, Any]:
            audit = {
                "phase": phase,
                "status": status,
                "backup_created": backup_created,
                "backup_target": str(backup_target),
                "backup_source_path": backup_source_path,
                "patch_plan_valid": patch_plan_valid,
                "mutation_applied": mutation_applied,
                "post_write_verification_attempted": post_write_verification_attempted,
                "post_write_verification_succeeded": post_write_verification_succeeded,
                "rollback_attempted": rollback_attempted,
                "rollback_succeeded": rollback_succeeded,
                "rollback_trigger": rollback_trigger,
                "rollback_outcome": rollback_outcome,
                "summary": summary,
            }
            if include_verification_paths:
                audit["verified_operation_paths"] = list(verified_operation_paths)
                audit["verification_mismatched_paths"] = list(
                    verification_mismatched_paths
                )
            return audit

        def _attempt_rollback(*, trigger: str) -> tuple[bool, bool, str | None, str | None, str]:
            rollback_error_local: str | None = None
            rollback_verification_error_local: str | None = None
            rollback_verification_succeeded_local = False
            rollback_outcome_local = "restore_failed"
            try:
                backup_payload = backup_target.read_text(encoding="utf-8")
                manifest_path.write_text(backup_payload, encoding="utf-8")
                try:
                    restored_payload = manifest_path.read_text(encoding="utf-8")
                    rollback_verification_succeeded_local = restored_payload == backup_payload
                    if rollback_verification_succeeded_local:
                        rollback_outcome_local = "restored_and_verified"
                    else:
                        rollback_verification_error_local = (
                            "Restored manifest content did not match backup payload."
                        )
                        rollback_outcome_local = "restored_but_unverified"
                except (OSError, json.JSONDecodeError) as exc:
                    rollback_verification_error_local = str(exc)
                    rollback_outcome_local = "restored_but_unverified"
                return (
                    True,
                    rollback_verification_succeeded_local,
                    rollback_error_local,
                    rollback_verification_error_local,
                    rollback_outcome_local,
                )
            except OSError as exc:
                rollback_error_local = str(exc)
                return (
                    False,
                    False,
                    rollback_error_local,
                    rollback_verification_error_local,
                    rollback_outcome_local,
                )

        if mutation_applied:
            mutated_manifest = dict(manifest)
            for operation in supported_operations:
                key = str(operation.get("path", "")).strip().lstrip("/")
                mutated_manifest[key] = operation.get("value")
            try:
                manifest_path.write_text(
                    json.dumps(mutated_manifest, indent=2) + "\n",
                    encoding="utf-8",
                )
                manifest = mutated_manifest
                applied_operation_count = len(supported_operations)
            except OSError as exc:
                rollback_attempted = True
                rollback_trigger = "mutation_write_failure"
                (
                    rollback_succeeded,
                    rollback_verification_succeeded,
                    rollback_error,
                    rollback_verification_error,
                    rollback_outcome,
                ) = _attempt_rollback(trigger=rollback_trigger)
                rollback_verification_attempted = rollback_succeeded
                mutation_audit = _build_mutation_audit(
                    phase="rollback",
                    status=(
                        "rolled_back"
                        if rollback_outcome == "restored_and_verified"
                        else "failed"
                    ),
                    summary=(
                        "Mutation write failed and rollback restored the manifest."
                        if rollback_outcome == "restored_and_verified"
                        else (
                            "Mutation write failed and rollback could not fully "
                            "verify the manifest restore."
                        )
                    ),
                )
                raise AdapterExecutionRejected(
                    "Real settings.patch mutation failed while writing the manifest "
                    "and triggered rollback handling.",
                    details={
                        "inspection_surface": "settings_patch_mutation",
                        "project_manifest_path": str(manifest_path),
                        "backup_source_path": backup_source_path,
                        "backup_target": str(backup_target),
                        "backup_created": backup_created,
                        "registry_path": registry_path,
                        "operation_count": len(normalized_operations),
                        "supported_operation_count": len(supported_operations),
                        "unsupported_operation_count": len(unsupported_operations),
                        "supported_operation_paths": supported_operation_paths,
                        "unsupported_operation_paths": unsupported_operation_paths,
                        "rollback_attempted": rollback_attempted,
                        "rollback_succeeded": rollback_succeeded,
                        "rollback_trigger": rollback_trigger,
                        "rollback_outcome": rollback_outcome,
                        "rollback_error": rollback_error,
                        "rollback_verification_attempted": rollback_verification_attempted,
                        "rollback_verification_succeeded": rollback_verification_succeeded,
                        "rollback_verification_error": rollback_verification_error,
                        "mutation_audit": mutation_audit,
                        "backup_provenance": {
                            "source_path": backup_source_path,
                            "backup_target": str(backup_target),
                            "backup_created": backup_created,
                        },
                    },
                    warnings=[
                        "settings.patch mutation failed during manifest write and "
                        "triggered rollback handling."
                    ],
                    logs=[
                        "Hybrid adapter mode enabled a real settings.patch mutation path.",
                        f"Read project manifest from '{manifest_path}'.",
                        f"Mutation write failed for '{manifest_path}': {exc}",
                        (
                            "Rollback restored and verified manifest content from "
                            f"'{backup_target}'."
                            if rollback_outcome == "restored_and_verified"
                            else f"Rollback restored manifest content from '{backup_target}', "
                            "but verification remained incomplete."
                            if rollback_succeeded
                            else "Rollback could not restore manifest content after the "
                            "failed mutation write."
                        ),
                    ],
                ) from exc
            post_write_verification_attempted = True
            try:
                verified_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                verification_error = str(exc)
                rollback_attempted = True
                rollback_trigger = "post_write_verification_reload_failure"
                (
                    rollback_succeeded,
                    rollback_verification_succeeded,
                    rollback_error,
                    rollback_verification_error,
                    rollback_outcome,
                ) = _attempt_rollback(trigger=rollback_trigger)
                rollback_verification_attempted = rollback_succeeded
                mutation_audit = _build_mutation_audit(
                    phase="rollback",
                    status=(
                        "rolled_back"
                        if rollback_outcome == "restored_and_verified"
                        else "failed"
                    ),
                    summary=(
                        "Post-write verification reload failed and rollback "
                        "restored the manifest."
                        if rollback_outcome == "restored_and_verified"
                        else (
                            "Post-write verification reload failed and rollback "
                            "could not fully verify the manifest restore."
                        )
                    ),
                )
                raise AdapterExecutionRejected(
                    "Real settings.patch mutation failed post-write verification and "
                    "triggered rollback handling.",
                    details={
                        "inspection_surface": "settings_patch_mutation",
                        "project_manifest_path": str(manifest_path),
                        "backup_source_path": backup_source_path,
                        "backup_target": str(backup_target),
                        "backup_created": backup_created,
                        "registry_path": registry_path,
                        "operation_count": len(normalized_operations),
                        "supported_operation_count": len(supported_operations),
                        "unsupported_operation_count": len(unsupported_operations),
                        "supported_operation_paths": supported_operation_paths,
                        "unsupported_operation_paths": unsupported_operation_paths,
                        "rollback_attempted": rollback_attempted,
                        "rollback_succeeded": rollback_succeeded,
                        "rollback_trigger": rollback_trigger,
                        "rollback_outcome": rollback_outcome,
                        "rollback_error": rollback_error,
                        "rollback_verification_attempted": rollback_verification_attempted,
                        "rollback_verification_succeeded": rollback_verification_succeeded,
                        "rollback_verification_error": rollback_verification_error,
                        "post_write_verification_attempted": True,
                        "post_write_verification_succeeded": False,
                        "verification_error": verification_error,
                        "mutation_audit": mutation_audit,
                        "backup_provenance": {
                            "source_path": backup_source_path,
                            "backup_target": str(backup_target),
                            "backup_created": backup_created,
                        },
                    },
                    warnings=[
                        "settings.patch mutation write completed, but post-write "
                        "verification failed and triggered rollback handling."
                    ],
                    logs=[
                        "Hybrid adapter mode enabled a real settings.patch mutation path.",
                        f"Read project manifest from '{manifest_path}'.",
                        "Post-write verification could not reload "
                        f"'{manifest_path}': {verification_error}",
                        (
                            "Rollback restored and verified manifest content from "
                            f"'{backup_target}'."
                            if rollback_outcome == "restored_and_verified"
                            else f"Rollback restored manifest content from '{backup_target}', "
                            "but verification remained incomplete."
                            if rollback_succeeded
                            else "Rollback could not restore manifest content after the "
                            "post-write verification failure."
                        ),
                    ],
                ) from exc
            for operation in supported_operations:
                key = str(operation.get("path", "")).strip().lstrip("/")
                expected_value = operation.get("value")
                if verified_manifest.get(key) == expected_value:
                    verified_operation_paths.append(f"/{key}")
                else:
                    verification_mismatched_paths.append(f"/{key}")
            if verification_mismatched_paths:
                verification_error = (
                    "Post-write verification did not match expected manifest values."
                )
                rollback_attempted = True
                rollback_trigger = "post_write_verification_value_mismatch"
                (
                    rollback_succeeded,
                    rollback_verification_succeeded,
                    rollback_error,
                    rollback_verification_error,
                    rollback_outcome,
                ) = _attempt_rollback(trigger=rollback_trigger)
                rollback_verification_attempted = rollback_succeeded
                mutation_audit = _build_mutation_audit(
                    phase="rollback",
                    status=(
                        "rolled_back"
                        if rollback_outcome == "restored_and_verified"
                        else "failed"
                    ),
                    summary=(
                        "Post-write verification detected mismatched values and "
                        "rollback restored the manifest."
                        if rollback_outcome == "restored_and_verified"
                        else (
                            "Post-write verification detected mismatched values "
                            "and rollback could not fully verify the manifest "
                            "restore."
                        )
                    ),
                    include_verification_paths=True,
                )
                raise AdapterExecutionRejected(
                    "Real settings.patch mutation failed post-write verification and "
                    "triggered rollback handling.",
                    details={
                        "inspection_surface": "settings_patch_mutation",
                        "project_manifest_path": str(manifest_path),
                        "backup_source_path": backup_source_path,
                        "backup_target": str(backup_target),
                        "backup_created": backup_created,
                        "registry_path": registry_path,
                        "operation_count": len(normalized_operations),
                        "supported_operation_count": len(supported_operations),
                        "unsupported_operation_count": len(unsupported_operations),
                        "supported_operation_paths": supported_operation_paths,
                        "unsupported_operation_paths": unsupported_operation_paths,
                        "rollback_attempted": rollback_attempted,
                        "rollback_succeeded": rollback_succeeded,
                        "rollback_trigger": rollback_trigger,
                        "rollback_outcome": rollback_outcome,
                        "rollback_error": rollback_error,
                        "rollback_verification_attempted": rollback_verification_attempted,
                        "rollback_verification_succeeded": rollback_verification_succeeded,
                        "rollback_verification_error": rollback_verification_error,
                        "post_write_verification_attempted": True,
                        "post_write_verification_succeeded": False,
                        "verified_operation_paths": verified_operation_paths,
                        "verification_mismatched_paths": verification_mismatched_paths,
                        "verification_error": verification_error,
                        "mutation_audit": mutation_audit,
                        "backup_provenance": {
                            "source_path": backup_source_path,
                            "backup_target": str(backup_target),
                            "backup_created": backup_created,
                        },
                    },
                    warnings=[
                        "settings.patch mutation values did not pass post-write "
                        "verification and triggered rollback handling."
                    ],
                    logs=[
                        "Hybrid adapter mode enabled a real settings.patch mutation path.",
                        f"Read project manifest from '{manifest_path}'.",
                        "Post-write verification found mismatched manifest values.",
                        (
                            "Rollback restored and verified manifest content from "
                            f"'{backup_target}'."
                            if rollback_outcome == "restored_and_verified"
                            else f"Rollback restored manifest content from '{backup_target}', "
                            "but verification remained incomplete."
                            if rollback_succeeded
                            else "Rollback could not restore manifest content after the "
                            "post-write verification mismatch."
                        ),
                    ],
                )
            post_write_verification_succeeded = True
        post_backup_validation = {
            "registry_path_admitted": registry_path_admitted,
            "supported_operations_present": len(supported_operations) > 0,
            "unsupported_operations_present": len(unsupported_operations) > 0,
            "backup_created": backup_created,
            "patch_plan_valid": patch_plan_valid,
            "mutation_ready": mutation_ready,
            "mutation_blocked": mutation_blocked,
            "mutation_applied": mutation_applied,
        }
        manifest_keys = sorted(str(key) for key in manifest.keys())
        plan_details = {
            "registry_path": registry_path,
            "operation_count": len(normalized_operations),
            "supported_operation_count": len(supported_operations),
            "unsupported_operation_count": len(unsupported_operations),
            "supported_operation_paths": supported_operation_paths,
            "unsupported_operation_paths": unsupported_operation_paths,
            "admitted_registry_path": "/O3DE/Settings",
            "admitted_manifest_paths": admitted_manifest_paths,
            "backup_source_path": backup_source_path,
            "backup_target": str(backup_target),
            "backup_created": backup_created,
            "backup_provenance": {
                "source_path": backup_source_path,
                "backup_target": str(backup_target),
                "backup_created": backup_created,
            },
            "rollback_strategy": rollback_strategy,
            "rollback_ready": rollback_ready,
            "rollback_artifact_path": str(backup_target),
            "patch_plan_valid": patch_plan_valid,
            "post_backup_validation": post_backup_validation,
            "mutation_ready": mutation_ready,
            "mutation_blocked": mutation_blocked,
            "mutation_blocked_reason": mutation_blocked_reason,
            "mutation_applied": mutation_applied,
            "rollback_attempted": rollback_attempted,
            "rollback_succeeded": rollback_succeeded,
            "rollback_trigger": rollback_trigger,
            "rollback_outcome": rollback_outcome,
            "rollback_verification_attempted": rollback_verification_attempted,
            "rollback_verification_succeeded": rollback_verification_succeeded,
            "rollback_verification_error": rollback_verification_error,
            "applied_operation_count": applied_operation_count,
            "post_write_verification_attempted": post_write_verification_attempted,
            "post_write_verification_succeeded": post_write_verification_succeeded,
            "verified_operation_paths": verified_operation_paths,
            "verification_mismatched_paths": verification_mismatched_paths,
            "verification_error": verification_error,
            "project_manifest_path": str(manifest_path),
        }
        warnings: list[str] = []
        if mutation_applied:
            warnings.append(
                "A real settings.patch mutation was applied only for the fully "
                "admitted manifest-backed set-only path in this slice."
            )
        else:
            warnings.append(
                "This is a real settings.patch preflight only; no settings were written."
            )
        if backup_created:
            warnings.append(
                (
                    "A real backup file was created before the settings.patch mutation."
                    if mutation_applied
                    else "A real backup file was created for this dry-run preflight, "
                    "but no settings were written in this slice."
                )
            )
        else:
            warnings.append(
                "Backup creation was not attempted because no admitted settings.patch "
                "operations were available for the current real preflight scope."
            )
        if registry_path != "/O3DE/Settings":
            warnings.append(
                "Requested registry_path is outside the admitted real preflight scope; "
                "this slice only admits /O3DE/Settings."
            )
        if unsupported_operations:
            warnings.append(
                "Some requested operations are outside the admitted manifest-backed "
                "settings scope and remain non-admitted in this slice."
            )
        if not supported_operations:
            warnings.append(
                "No requested operations matched the admitted manifest-backed settings "
                "preflight scope."
            )
        if patch_plan_valid:
            warnings.append(
                (
                    "Post-backup patch-plan validation passed for the admitted settings "
                    "scope, and the mutation was applied in this slice."
                    if mutation_applied
                    else "Post-backup patch-plan validation passed for the admitted "
                    "settings scope, and the run is now mutation-ready but intentionally "
                    "write-blocked in this slice."
                )
            )
        if post_write_verification_succeeded:
            warnings.append(
                "Post-write verification re-read the manifest and confirmed the "
                "expected settings values."
            )
        else:
            if not patch_plan_valid:
                warnings.append(
                    "Post-backup patch-plan validation remains partial; this run published "
                    "rollback planning metadata without admitting mutation."
                )

        message = "Real settings.patch preflight completed; no settings were written."
        if isinstance(project_name, str) and project_name.strip():
            message = (
                "Real settings.patch preflight completed for "
                f"'{project_name}'; no settings were written."
            )
        if mutation_applied:
            message = "Real settings.patch mutation completed; settings were written."
            if isinstance(project_name, str) and project_name.strip():
                message = (
                    "Real settings.patch mutation completed for "
                    f"'{project_name}'; settings were written."
                )
        if mutation_blocked:
            message = (
                "Real settings.patch preflight completed; the plan is ready for "
                "mutation, but writes remain intentionally disabled."
            )
            if isinstance(project_name, str) and project_name.strip():
                message = (
                    "Real settings.patch preflight completed for "
                    f"'{project_name}'; the plan is ready for mutation, but writes "
                    "remain intentionally disabled."
                )

        mutation_audit = _build_mutation_audit(
            phase="mutation" if mutation_applied else "preflight",
            status=(
                "succeeded"
                if mutation_applied
                else "blocked"
                if mutation_blocked
                else "preflight"
            ),
            summary=(
                "A real settings.patch mutation was applied and verified."
                if mutation_applied and post_write_verification_succeeded
                else "A real settings.patch mutation was applied."
                if mutation_applied
                else (
                    "The admitted settings.patch plan is mutation-ready, but "
                    "writes remain intentionally disabled."
                )
                if mutation_blocked
                else (
                    "The real settings.patch path published preflight evidence "
                    "only; no settings were written."
                )
            ),
            include_verification_paths=True,
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
        details = {
            "simulated": False,
            "adapter_mode": "real",
            "adapter_family": self.family,
            "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
            "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
            "inspection_surface": (
                "settings_patch_mutation"
                if mutation_applied
                else "settings_patch_preflight"
            ),
            "real_path_available": True,
            "project_manifest_path": str(manifest_path),
            "manifest_keys": manifest_keys,
            "project_name": project_name,
            "registry_path": registry_path,
            "operation_count": len(normalized_operations),
            "supported_operation_count": len(supported_operations),
            "unsupported_operation_count": len(unsupported_operations),
            "supported_operation_paths": supported_operation_paths,
            "unsupported_operation_paths": unsupported_operation_paths,
            "admitted_registry_path": "/O3DE/Settings",
            "admitted_manifest_paths": admitted_manifest_paths,
            "backup_source_path": backup_source_path,
            "backup_target": str(backup_target),
            "backup_created": backup_created,
            "backup_provenance": {
                "source_path": backup_source_path,
                "backup_target": str(backup_target),
                "backup_created": backup_created,
            },
            "rollback_strategy": rollback_strategy,
            "rollback_ready": rollback_ready,
            "rollback_artifact_path": str(backup_target),
            "patch_plan_valid": patch_plan_valid,
            "post_backup_validation": post_backup_validation,
            "mutation_ready": mutation_ready,
            "mutation_blocked": mutation_blocked,
            "mutation_blocked_reason": mutation_blocked_reason,
            "mutation_applied": mutation_applied,
            "rollback_attempted": rollback_attempted,
            "rollback_succeeded": rollback_succeeded,
            "rollback_trigger": rollback_trigger,
            "rollback_outcome": rollback_outcome,
            "rollback_verification_attempted": rollback_verification_attempted,
            "rollback_verification_succeeded": rollback_verification_succeeded,
            "rollback_verification_error": rollback_verification_error,
            "applied_operation_count": applied_operation_count,
            "post_write_verification_attempted": post_write_verification_attempted,
            "post_write_verification_succeeded": post_write_verification_succeeded,
            "verified_operation_paths": verified_operation_paths,
            "verification_mismatched_paths": verification_mismatched_paths,
            "verification_error": verification_error,
            "mutation_audit": mutation_audit,
            "plan_details": plan_details,
        }
        return AdapterExecutionReport(
            execution_mode="real",
            result=result,
            warnings=warnings,
            logs=[
                (
                    "Hybrid adapter mode enabled a real settings.patch mutation path."
                    if mutation_applied
                    else "Hybrid adapter mode enabled a real settings.patch preflight "
                    "path."
                ),
                f"Read project manifest from '{manifest_path}'.",
                (
                    f"Created settings.patch preflight backup at '{backup_target}'."
                    if backup_created
                    else "Skipped backup creation because no admitted operations were "
                    "available for the current real preflight scope."
                ),
                (
                    "Matched admitted manifest-backed settings operations for dry-run "
                    f"preflight: {len(supported_operations)} supported, "
                    f"{len(unsupported_operations)} unsupported."
                ),
                (
                    "Validated a fully admitted post-backup patch plan and applied the "
                    "settings.patch mutation using the published rollback boundary."
                    if mutation_applied
                    else "Validated a fully admitted post-backup patch plan with "
                    "rollback metadata published; writes remain intentionally disabled."
                    if patch_plan_valid
                    else "Published partial post-backup patch-plan validation and "
                    "rollback metadata; mutation remains non-admitted."
                ),
                (
                    "Post-write verification re-read the manifest and confirmed all "
                    "admitted setting values."
                    if post_write_verification_succeeded
                    else "Post-write verification was not required for this execution path."
                ),
            ],
            artifact_label=(
                "Real settings patch mutation evidence"
                if mutation_applied
                else "Real settings patch preflight evidence"
            ),
            artifact_kind=(
                "settings_patch_mutation"
                if mutation_applied
                else "settings_patch_preflight"
            ),
            artifact_uri=manifest_path.as_uri(),
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                **details,
            },
            execution_details=details,
            result_summary=(
                "Real settings.patch mutation completed successfully."
                if mutation_applied
                else "Real settings.patch preflight completed successfully."
            ),
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

    def _fallback_settings_patch(
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
            "Hybrid mode fell back to the simulated settings.patch path."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.artifact_metadata["real_path_available"] = False
        simulated.artifact_metadata["fallback_reason"] = reason
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["real_path_available"] = False
        simulated.execution_details["fallback_reason"] = reason
        simulated.result_summary = "settings.patch fell back to the simulated path."
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
                    "path, a real plan-only build.configure preflight path, and a "
                    "real dry-run-only settings.patch preflight path.",
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
                    "Hybrid mode also enables a real dry-run-only settings.patch "
                    "preflight path when manifest-backed settings admission criteria "
                    "are satisfied.",
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
                    "build.configure and settings.patch currently have real "
                    "preflight-only paths in this family."
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
