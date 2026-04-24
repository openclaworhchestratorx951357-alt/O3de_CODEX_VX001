import csv
import hashlib
import json
import mimetypes
import os
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:  # pragma: no cover - runtime fallback when Pillow is unavailable
    Image = None
    UnidentifiedImageError = OSError

from app.models.api import AdapterFamilyStatus, AdapterModeStatus, AdaptersResponse
from app.models.response_envelope import DispatchResult
from app.services.artifacts import artifacts_service
from app.services.catalog import catalog_service
from app.services.editor_automation_runtime import (
    EDITOR_RUNTIME_BOUNDARY,
    editor_automation_runtime_service,
)

SUPPORTED_ADAPTER_MODES = {"hybrid", "simulated"}
ADAPTER_CONTRACT_VERSION = "v0.1"
REAL_TOOL_PATHS_BY_MODE = {
    "simulated": [],
    "hybrid": [
        "editor.session.open",
        "editor.level.open",
        "editor.entity.create",
        "editor.component.add",
        "editor.component.property.get",
        "asset.processor.status",
        "asset.source.inspect",
        "render.capture.viewport",
        "render.material.inspect",
        "project.inspect",
        "test.visual.diff",
    ],
}
PLAN_ONLY_TOOL_PATHS_BY_MODE = {
    "simulated": [],
    "hybrid": ["build.configure", "settings.patch"],
}
ADAPTER_EXECUTION_BOUNDARY = (
    "Control-plane bookkeeping is real, but O3DE tool execution remains simulated."
)
HYBRID_EXECUTION_BOUNDARY = (
    "Control-plane bookkeeping is real. In hybrid mode, asset.processor.status may "
    "use a real read-only host runtime probe, asset.source.inspect may "
    "use a real read-only project-local source inspection path, project.inspect may use a "
    "real read-only project-manifest path, test.visual.diff may use a real "
    "read-only explicit viewport-capture substrate probe, render.material.inspect may use a "
    "real read-only explicit material-inspection runtime probe, "
    "read-only explicit artifact comparison path, "
    "editor.level.open may use the "
    "live-validated admitted real editor runtime path on McpSandbox, "
    "editor.session.open may use the live-validated admitted real editor session path, "
    "editor.entity.create may use the live-validated admitted real root-level "
    "entity creation path on McpSandbox, editor.component.add may use the "
    "allowlist-bound bridge-backed real component attachment path on McpSandbox, "
    "editor.component.property.get may use the explicit bridge-backed real "
    "component property read path on McpSandbox, "
    "build.configure may use a real plan-only preflight path, settings.patch may "
    "use a real dry-run-only preflight path, and all other tools remain simulated."
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
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
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
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
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
                        "editor.component.property.get",
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
                        "editor.component.property.get",
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


class EditorControlHybridAdapter(ToolExecutionAdapter):
    def __init__(self, *, family: str, mode: str) -> None:
        super().__init__(family=family, mode=mode)
        self._simulated = SimulatedToolExecutionAdapter(family=family, mode=mode)

    def execute(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        if tool == "editor.session.open":
            runtime_payload = editor_automation_runtime_service.execute_session_open(
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                locks_acquired=locks_acquired,
            )
            return self._build_real_editor_report(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                runtime_payload=runtime_payload,
                inspection_surface="editor_session_runtime",
                message="Real editor.session.open completed through the admitted editor runtime path.",
                result_summary="Real editor session runtime completed successfully.",
                artifact_label="Real editor session evidence",
                artifact_kind="editor_runtime_result",
                artifact_uri="editor-runtime://runs/{run_id}/executions/{execution_id}/session",
                runtime_script="session_ensure.py",
            )
        if tool == "editor.level.open":
            runtime_payload = editor_automation_runtime_service.execute_level_open(
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                locks_acquired=locks_acquired,
            )
            created_level = bool(runtime_payload["runtime_result"].get("created_level", False))
            return self._build_real_editor_report(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                runtime_payload=runtime_payload,
                inspection_surface=(
                    "editor_level_created" if created_level else "editor_level_opened"
                ),
                message=(
                    "Real editor.level.open created the requested level through the admitted editor runtime path."
                    if created_level
                    else "Real editor.level.open opened the requested level through the admitted editor runtime path."
                ),
                result_summary="Real editor level create/open runtime completed successfully.",
                artifact_label="Real editor level evidence",
                artifact_kind="editor_runtime_result",
                artifact_uri="editor-runtime://runs/{run_id}/executions/{execution_id}/level",
                runtime_script="level_ensure_open_or_create.py",
            )
        if tool == "editor.entity.create":
            runtime_payload = editor_automation_runtime_service.execute_entity_create(
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                locks_acquired=locks_acquired,
            )
            return self._build_real_editor_report(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                runtime_payload=runtime_payload,
                inspection_surface="editor_entity_created",
                message=(
                    "Real editor.entity.create completed through the admitted "
                    "bridge-backed editor authoring path."
                ),
                result_summary=(
                    "Real editor entity creation completed successfully through "
                    "the admitted bridge-backed path."
                ),
                artifact_label="Real editor entity evidence",
                artifact_kind="editor_runtime_result",
                artifact_uri="editor-runtime://runs/{run_id}/executions/{execution_id}/entity",
                runtime_script="ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
            )
        if tool == "editor.component.add":
            runtime_payload = editor_automation_runtime_service.execute_component_add(
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                locks_acquired=locks_acquired,
            )
            return self._build_real_editor_report(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                runtime_payload=runtime_payload,
                inspection_surface="editor_component_added",
                message=(
                    "Real editor.component.add completed through the admitted "
                    "bridge-backed editor authoring path."
                ),
                result_summary=(
                    "Real editor component attachment completed successfully through "
                    "the admitted bridge-backed path."
                ),
                artifact_label="Real editor component evidence",
                artifact_kind="editor_runtime_result",
                artifact_uri="editor-runtime://runs/{run_id}/executions/{execution_id}/component",
                runtime_script="ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
            )
        if tool == "editor.component.property.get":
            runtime_payload = editor_automation_runtime_service.execute_component_property_get(
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                locks_acquired=locks_acquired,
            )
            return self._build_real_editor_report(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                runtime_payload=runtime_payload,
                inspection_surface="editor_component_property_read",
                message=(
                    "Real editor.component.property.get completed through the admitted "
                    "bridge-backed editor read-only path."
                ),
                result_summary=(
                    "Real editor component property read completed successfully through "
                    "the admitted bridge-backed path."
                ),
                artifact_label="Real editor component property evidence",
                artifact_kind="editor_runtime_result",
                artifact_uri="editor-runtime://runs/{run_id}/executions/{execution_id}/component-property",
                runtime_script="ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
            )

        simulated = self._simulated.execute(
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
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
            "Hybrid adapter mode is active, but this editor tool still runs through "
            "the simulated path in this phase."
        )
        simulated.logs.append(
            "Hybrid mode did not change execution for this editor tool; the "
            "simulated adapter path remained in use."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        return simulated

    def _build_real_editor_report(
        self,
        *,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        approval_class: str,
        locks_acquired: list[str],
        runtime_payload: dict[str, Any],
        inspection_surface: str,
        message: str,
        result_summary: str,
        artifact_label: str,
        artifact_kind: str,
        artifact_uri: str,
        runtime_script: str,
    ) -> AdapterExecutionReport:
        runtime_result = runtime_payload["runtime_result"]
        runner_command = runtime_payload["runner_command"]
        runtime_script_name = str(runtime_payload.get("runtime_script") or runtime_script)
        exact_editor_apis = runtime_result.get("exact_editor_apis")
        logs = [
            "Real editor runtime preflight succeeded.",
            f"Runtime script executed: {runtime_script_name}",
        ]
        if isinstance(exact_editor_apis, list) and exact_editor_apis:
            logs.append(
                "Exact editor APIs used: " + ", ".join(str(item) for item in exact_editor_apis)
            )
        result = DispatchResult(
            status="real_success",
            tool=tool,
            agent=agent,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=False,
            simulated=False,
            execution_mode="real",
            approval_class=approval_class,
            locks_acquired=locks_acquired,
            message=message,
        )
        details = {
            "inspection_surface": inspection_surface,
            "execution_boundary": EDITOR_RUNTIME_BOUNDARY,
            "simulated": False,
            "adapter_family": self.family,
            "adapter_mode": self.mode,
            "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
            "real_path_available": True,
            "python_editor_bindings_enabled": True,
            "editor_runtime_available": True,
            "runner_family": "editor-python-bindings",
            "runtime_script": runtime_script_name,
            "project_root_path": str(Path(project_root).expanduser().resolve()),
            "engine_root_path": str(Path(engine_root).expanduser().resolve()),
            "configured_runner_command": runner_command,
            "exact_editor_apis": exact_editor_apis if isinstance(exact_editor_apis, list) else [],
            "refused_operations": [],
        }
        for key in (
            "editor_session_id",
            "loaded_level_path",
            "created_level",
            "entity_id",
            "entity_name",
            "component_id",
            "property_path",
            "value",
            "value_type",
            "added_components",
            "added_component_refs",
            "rejected_components",
            "modified_entities",
            "entity_id_source",
            "direct_return_entity_id",
            "notification_entity_ids",
            "selected_entity_count_before_create",
            "level_path",
            "name_mutation_ran",
            "name_mutation_succeeded",
            "bridge_name",
            "bridge_version",
            "bridge_available",
            "bridge_operation",
            "bridge_contract_version",
            "bridge_command_id",
            "bridge_result_summary",
            "bridge_error_code",
            "bridge_heartbeat_seen_at",
            "bridge_queue_mode",
            "bridge_selected_entity_count",
            "bridge_prefab_context_notes",
            "editor_transport",
            "editor_log_path",
            "restore_boundary_created",
            "restore_boundary_id",
            "restore_boundary_scope",
            "restore_strategy",
            "restore_boundary_created_at",
            "restore_boundary_level_path",
            "restore_boundary_source_path",
            "restore_boundary_backup_path",
            "restore_boundary_backup_sha256",
            "restore_boundary_available",
            "restore_invoked",
            "restore_attempted",
            "restore_trigger",
            "restore_result",
            "restore_error",
            "restore_succeeded",
            "restore_verification_attempted",
            "restore_verification_succeeded",
            "restore_restored_sha256",
        ):
            if key in runtime_result and runtime_result[key] is not None:
                details[key] = runtime_result[key]
        return AdapterExecutionReport(
            execution_mode="real",
            result=result,
            warnings=[],
            logs=logs,
            artifact_label=artifact_label,
            artifact_kind=artifact_kind,
            artifact_uri=artifact_uri,
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                **details,
            },
            execution_details=details,
            result_summary=result_summary,
        )


class AssetPipelineHybridAdapter(ToolExecutionAdapter):
    def __init__(self, *, family: str, mode: str) -> None:
        super().__init__(family=family, mode=mode)
        self._simulated = SimulatedToolExecutionAdapter(family=family, mode=mode)

    def execute(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        if tool == "asset.processor.status":
            return self._execute_asset_processor_status(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
            )
        if tool == "asset.source.inspect":
            return self._execute_asset_source_inspect(
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
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
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
            "Hybrid adapter mode is active, but this asset-pipeline tool still runs "
            "through the simulated path in this phase."
        )
        simulated.logs.append(
            "Hybrid mode did not change execution for this asset-pipeline tool; "
            "the simulated adapter path remained in use."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        return simulated

    def _execute_asset_processor_status(
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
        include_jobs = bool(args.get("include_jobs", False))
        include_platforms = bool(args.get("include_platforms", False))
        runtime_probe = self._probe_asset_processor_runtime()
        runtime_probe_available = bool(runtime_probe.get("runtime_probe_available", False))
        runtime_probe_method = str(runtime_probe.get("runtime_probe_method", "host-process-list"))
        runtime_probe_error = runtime_probe.get("runtime_probe_error")
        runtime_process_ids = [
            int(pid)
            for pid in runtime_probe.get("runtime_process_ids", [])
            if isinstance(pid, int)
        ]
        runtime_process_names = [
            str(name)
            for name in runtime_probe.get("runtime_process_names", [])
            if isinstance(name, str) and name
        ]
        runtime_process_count = len(runtime_process_ids)
        runtime_available = runtime_probe_available and runtime_process_count > 0
        runtime_status = (
            "running"
            if runtime_available
            else ("not-running" if runtime_probe_available else "unknown")
        )
        warnings: list[str] = []
        inspection_evidence = ["runtime_probe_attempt"]
        unavailable_evidence: list[str] = []
        logs = [
            "Real asset.processor.status executed through the admitted host runtime probe.",
            f"Runtime probe method: {runtime_probe_method}",
        ]
        if runtime_probe_available:
            inspection_evidence.append("runtime_process_visibility")
            logs.append(
                f"Asset Processor runtime probe observed {runtime_process_count} matching process(es)."
            )
        else:
            unavailable_evidence.append("runtime")
            if isinstance(runtime_probe_error, str) and runtime_probe_error:
                warnings.append(runtime_probe_error)
                logs.append(runtime_probe_error)
            logs.append(
                "Asset Processor runtime visibility is unavailable on this host through the admitted probe."
            )

        job_unavailable_reason = (
            "No admitted real Asset Processor job telemetry substrate is available in this slice."
        )
        platform_unavailable_reason = (
            "No admitted real Asset Processor platform status substrate is available in this slice."
        )
        if include_jobs:
            unavailable_evidence.append("jobs")
            logs.append(job_unavailable_reason)
        if include_platforms:
            unavailable_evidence.append("platforms")
            logs.append(platform_unavailable_reason)

        message = (
            "Read-only Asset Processor status inspection completed against the admitted host runtime probe."
        )
        if runtime_status == "running":
            message = (
                "Read-only Asset Processor status inspection completed and confirmed a running Asset Processor runtime."
            )
        elif runtime_status == "not-running":
            message = (
                "Read-only Asset Processor status inspection completed and found no running Asset Processor runtime."
            )
        elif runtime_status == "unknown":
            message = (
                "Read-only Asset Processor status inspection completed, but runtime visibility is unavailable on this host."
            )

        details = {
            "inspection_surface": "asset_processor_runtime",
            "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
            "simulated": False,
            "adapter_family": self.family,
            "adapter_mode": self.mode,
            "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
            "real_path_available": True,
            "project_root_path": str(Path(project_root).expanduser().resolve()),
            "engine_root_path": str(Path(engine_root).expanduser().resolve()),
            "runtime_probe_method": runtime_probe_method,
            "runtime_probe_available": runtime_probe_available,
            "runtime_probe_scope": "host-process-name",
            "runtime_probe_error": runtime_probe_error if isinstance(runtime_probe_error, str) and runtime_probe_error else None,
            "runtime_status": runtime_status,
            "runtime_available": runtime_available,
            "runtime_process_count": runtime_process_count,
            "runtime_process_ids": runtime_process_ids,
            "runtime_process_names": runtime_process_names,
            "candidate_process_names": [
                "AssetProcessor.exe",
                "AssetProcessor",
            ],
            "include_flags": {
                "include_jobs": include_jobs,
                "include_platforms": include_platforms,
            },
            "inspection_evidence": inspection_evidence,
            "unavailable_evidence": unavailable_evidence,
            "job_evidence_requested": include_jobs,
            "job_evidence_available": False,
            "job_count": 0,
            "jobs": [],
            "job_evidence_source": "unavailable-no-admitted-job-telemetry",
            "job_unavailable_reason": job_unavailable_reason,
            "platform_evidence_requested": include_platforms,
            "platform_evidence_available": False,
            "platform_count": 0,
            "platforms": [],
            "platform_evidence_source": "unavailable-no-admitted-platform-telemetry",
            "platform_unavailable_reason": platform_unavailable_reason,
        }
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
            logs=logs,
            artifact_label="Real Asset Processor status evidence",
            artifact_kind="asset_processor_status_result",
            artifact_uri="asset-processor://runs/{run_id}/executions/{execution_id}/status",
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                **details,
            },
            execution_details=details,
            result_summary="Real Asset Processor status inspection completed successfully.",
        )

    def _probe_asset_processor_runtime(self) -> dict[str, Any]:
        candidate_names = {"assetprocessor.exe", "assetprocessor"}
        if os.name == "nt":
            try:
                completed = subprocess.run(
                    ["tasklist", "/FO", "CSV", "/NH"],
                    capture_output=True,
                    text=True,
                    check=False,
                )
            except OSError as exc:
                return {
                    "runtime_probe_available": False,
                    "runtime_probe_method": "windows-tasklist",
                    "runtime_probe_error": (
                        "Asset Processor runtime probe is unavailable because tasklist could not be executed: "
                        f"{exc}"
                    ),
                    "runtime_process_ids": [],
                    "runtime_process_names": [],
                }
            if completed.returncode != 0:
                stderr = (completed.stderr or "").strip() or "tasklist returned a non-zero exit code."
                return {
                    "runtime_probe_available": False,
                    "runtime_probe_method": "windows-tasklist",
                    "runtime_probe_error": (
                        "Asset Processor runtime probe is unavailable because tasklist failed: "
                        f"{stderr}"
                    ),
                    "runtime_process_ids": [],
                    "runtime_process_names": [],
                }

            runtime_process_ids: list[int] = []
            runtime_process_names: list[str] = []
            for row in csv.reader(
                line
                for line in (completed.stdout or "").splitlines()
                if line.strip()
            ):
                if len(row) < 2:
                    continue
                image_name = row[0].strip()
                if image_name.lower() not in candidate_names:
                    continue
                try:
                    pid = int(row[1].strip())
                except ValueError:
                    continue
                runtime_process_ids.append(pid)
                runtime_process_names.append(image_name)
            return {
                "runtime_probe_available": True,
                "runtime_probe_method": "windows-tasklist",
                "runtime_process_ids": runtime_process_ids,
                "runtime_process_names": runtime_process_names,
            }

        try:
            completed = subprocess.run(
                ["ps", "-A", "-o", "pid=", "-o", "comm="],
                capture_output=True,
                text=True,
                check=False,
            )
        except OSError as exc:
            return {
                "runtime_probe_available": False,
                "runtime_probe_method": "posix-ps",
                "runtime_probe_error": (
                    "Asset Processor runtime probe is unavailable because ps could not be executed: "
                    f"{exc}"
                ),
                "runtime_process_ids": [],
                "runtime_process_names": [],
            }
        if completed.returncode != 0:
            stderr = (completed.stderr or "").strip() or "ps returned a non-zero exit code."
            return {
                "runtime_probe_available": False,
                "runtime_probe_method": "posix-ps",
                "runtime_probe_error": (
                    "Asset Processor runtime probe is unavailable because ps failed: "
                    f"{stderr}"
                ),
                "runtime_process_ids": [],
                "runtime_process_names": [],
            }

        runtime_process_ids: list[int] = []
        runtime_process_names: list[str] = []
        for line in (completed.stdout or "").splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            parts = stripped.split(None, 1)
            if len(parts) != 2:
                continue
            pid_text, image_name = parts
            if image_name.strip().lower() not in candidate_names:
                continue
            try:
                pid = int(pid_text)
            except ValueError:
                continue
            runtime_process_ids.append(pid)
            runtime_process_names.append(image_name.strip())
        return {
            "runtime_probe_available": True,
            "runtime_probe_method": "posix-ps",
            "runtime_process_ids": runtime_process_ids,
            "runtime_process_names": runtime_process_names,
        }

    def _execute_asset_source_inspect(
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
        resolved_project_root = Path(project_root).expanduser().resolve()
        source_path_input = str(args.get("source_path", "")).strip()
        include_products = bool(args.get("include_products", False))
        include_dependencies = bool(args.get("include_dependencies", False))

        if not source_path_input:
            return self._fallback_asset_source_inspect(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real asset inspection was unavailable because no explicit source "
                    "path was provided."
                ),
                fallback_category="missing-source-path",
            )

        source_candidate = Path(source_path_input).expanduser()
        resolved_source_path = (
            source_candidate.resolve()
            if source_candidate.is_absolute()
            else (resolved_project_root / source_candidate).resolve()
        )
        try:
            source_relative_path = str(
                resolved_source_path.relative_to(resolved_project_root)
            ).replace("\\", "/")
            source_within_project_root = True
        except ValueError:
            source_relative_path = None
            source_within_project_root = False

        if not source_within_project_root:
            return self._fallback_asset_source_inspect(
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
                reason=(
                    "Real asset inspection is limited to explicit source paths within "
                    f"the current project root; '{source_path_input}' resolved outside "
                    "that admitted boundary."
                ),
                fallback_category="outside-project-root",
            )

        source_exists = resolved_source_path.exists()
        source_is_file = resolved_source_path.is_file()
        source_size_bytes: int | None = None
        source_sha256: str | None = None
        source_resolution_status = "missing"
        inspection_evidence = ["source_path_identity", "source_resolution_status"]
        unavailable_evidence: list[str] = []
        warnings: list[str] = []
        logs = [
            "Real asset.source.inspect resolved the requested path against the project root.",
            f"Resolved source path: {resolved_source_path}",
        ]

        if source_exists and source_is_file:
            source_resolution_status = "resolved-file"
            source_size_bytes = resolved_source_path.stat().st_size
            source_sha256 = hashlib.sha256(resolved_source_path.read_bytes()).hexdigest()
            inspection_evidence.extend(["source_file_stat", "source_file_hash"])
            logs.append("Read-only source-file metadata and content hash were captured.")
        elif source_exists:
            source_resolution_status = "resolved-non-file"
            warnings.append(
                "The requested source path resolved within the project root but is not a file."
            )
            logs.append("Resolved source path exists but is not a file.")
        else:
            warnings.append(
                "The requested source path was not found within the project root."
            )
            logs.append("Resolved source path is missing on disk.")

        product_evidence_source = (
            "unavailable-missing-source"
            if not source_exists
            else "unavailable-no-admitted-product-index"
        )
        dependency_evidence_source = (
            "unavailable-missing-source"
            if not source_exists
            else "unavailable-no-admitted-dependency-index"
        )
        product_unavailable_reason = (
            "No admitted real product index or asset database is available in this slice."
        )
        dependency_unavailable_reason = (
            "No admitted real dependency index or asset database is available in this slice."
        )
        if not source_exists:
            product_unavailable_reason = (
                "The requested source path was not found, so no product evidence could be proven."
            )
            dependency_unavailable_reason = (
                "The requested source path was not found, so no dependency evidence could be proven."
            )

        if include_products:
            unavailable_evidence.append("products")
            logs.append(product_unavailable_reason)
        if include_dependencies:
            unavailable_evidence.append("dependencies")
            logs.append(dependency_unavailable_reason)

        message = "Read-only asset source inspection completed against real project files."
        if source_resolution_status == "missing":
            message = (
                "Read-only asset source inspection completed against real project files, "
                "but the requested source path was not found."
            )
        elif source_resolution_status == "resolved-non-file":
            message = (
                "Read-only asset source inspection completed against real project files, "
                "but the requested source path did not resolve to a file."
            )

        details = {
            "inspection_surface": "asset_source_file",
            "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
            "simulated": False,
            "adapter_family": self.family,
            "adapter_mode": self.mode,
            "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
            "real_path_available": True,
            "project_root_path": str(resolved_project_root),
            "source_path_input": source_path_input,
            "source_path_resolved": str(resolved_source_path),
            "source_path_relative_to_project_root": source_relative_path,
            "source_path_source_of_truth": (
                f"project_root/{source_relative_path}"
                if source_relative_path is not None
                else "project_root"
            ),
            "source_path_within_project_root": source_within_project_root,
            "source_read_mode": "read-only",
            "source_exists": source_exists,
            "source_is_file": source_is_file,
            "source_resolution_status": source_resolution_status,
            "source_name": resolved_source_path.name,
            "source_extension": resolved_source_path.suffix or None,
            "source_size_bytes": source_size_bytes,
            "source_sha256": source_sha256,
            "include_flags": {
                "include_products": include_products,
                "include_dependencies": include_dependencies,
            },
            "inspection_evidence": inspection_evidence,
            "unavailable_evidence": unavailable_evidence,
            "products": [],
            "product_count": 0,
            "product_evidence_requested": include_products,
            "product_evidence_available": False,
            "product_evidence_source": product_evidence_source,
            "product_unavailable_reason": product_unavailable_reason,
            "dependencies": [],
            "dependency_count": 0,
            "dependency_evidence_requested": include_dependencies,
            "dependency_evidence_available": False,
            "dependency_evidence_source": dependency_evidence_source,
            "dependency_unavailable_reason": dependency_unavailable_reason,
        }
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
        artifact_uri = (
            resolved_source_path.as_uri()
            if source_exists and source_is_file
            else "asset-inspect://runs/{run_id}/executions/{execution_id}/source"
        )
        return AdapterExecutionReport(
            execution_mode="real",
            result=result,
            warnings=warnings,
            logs=logs,
            artifact_label="Real asset source inspection evidence",
            artifact_kind="asset_inspection_result",
            artifact_uri=artifact_uri,
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                **details,
            },
            execution_details=details,
            result_summary="Real asset source inspection completed successfully.",
        )

    def _fallback_asset_source_inspect(
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
        fallback_category: str = "unavailable",
    ) -> AdapterExecutionReport:
        resolved_project_root = Path(project_root).expanduser().resolve()
        simulated = self._simulated.execute(
            request_id="",
            session_id=None,
            workspace_id=None,
            executor_id=None,
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
            "Hybrid mode fell back to the simulated asset.source.inspect path."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.artifact_metadata["real_path_available"] = False
        simulated.artifact_metadata["fallback_reason"] = reason
        simulated.artifact_metadata["fallback_category"] = fallback_category
        simulated.artifact_metadata["project_root_path"] = str(resolved_project_root)
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["real_path_available"] = False
        simulated.execution_details["fallback_reason"] = reason
        simulated.execution_details["fallback_category"] = fallback_category
        simulated.execution_details["project_root_path"] = str(resolved_project_root)
        simulated.result_summary = "Asset source inspection fell back to the simulated path."
        return simulated


class ProjectBuildHybridAdapter(ToolExecutionAdapter):
    def __init__(self, *, family: str, mode: str) -> None:
        super().__init__(family=family, mode=mode)
        self._simulated = SimulatedToolExecutionAdapter(family=family, mode=mode)

    def execute(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
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
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
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
        resolved_project_root = Path(project_root).expanduser().resolve()
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
                fallback_category="manifest-missing",
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
                fallback_category="manifest-unreadable",
            )

        project_name = manifest.get("project_name")
        enabled_gems = self._normalized_string_list(manifest.get("gem_names"))
        inspection_flags = {
            "include_project_config": bool(args.get("include_project_config", False)),
            "include_gems": bool(args.get("include_gems", False)),
            "include_settings": bool(args.get("include_settings", False)),
            "include_build_state": bool(args.get("include_build_state", False)),
        }
        manifest_path_relative_to_project_root = (
            str(manifest_path.relative_to(resolved_project_root))
            if manifest_path.is_relative_to(resolved_project_root)
            else None
        )
        manifest_path_within_project_root = manifest_path_relative_to_project_root is not None
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
        available_project_origin = self._manifest_origin_value(manifest)
        available_project_id = self._manifest_string_value(manifest, "project_id")
        available_user_tags = self._manifest_string_list_value(manifest, "user_tags")
        available_display_name = self._manifest_string_value(manifest, "display_name")
        available_icon_path = self._manifest_string_value(manifest, "icon_path")
        available_restricted_platform_name = self._manifest_string_value(
            manifest, "restricted_platform_name"
        )
        available_compatible_engines = self._manifest_compatible_engines(manifest)
        available_engine_api_dependency_keys = self._manifest_engine_api_dependency_keys(
            manifest
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
        requested_build_state_evidence = (
            ["build_state_request", "build_state_unavailable"]
            if inspection_flags["include_build_state"]
            else []
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
                (
                    "Build-state inspection was not requested."
                    if not inspection_flags["include_build_state"]
                    else "Build-state inspection was requested, but no real build-state "
                    "adapter path was used; the request remained explicitly simulated."
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
                "project_root_path": str(resolved_project_root),
                "project_manifest_relative_path": manifest_path_relative_to_project_root,
                "project_manifest_read_mode": "read-only",
                "project_manifest_source_of_truth": "project_root/project.json",
                "project_manifest_workspace_local": manifest_path_within_project_root,
                "project_manifest_within_project_root": manifest_path_within_project_root,
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
                "available_project_origin": available_project_origin,
                "available_project_origin_type": self._json_value_type(
                    available_project_origin
                ),
                "available_project_origin_keys": (
                    sorted(available_project_origin.keys())
                    if isinstance(available_project_origin, dict)
                    else []
                ),
                "project_origin_present": available_project_origin is not None,
                "available_project_id": available_project_id,
                "project_id_present": available_project_id is not None,
                "available_user_tags": available_user_tags,
                "available_user_tag_count": len(available_user_tags),
                "identity_fields_present": any(
                    [
                        available_project_id is not None,
                        len(available_user_tags) > 0,
                    ]
                ),
                "available_display_name": available_display_name,
                "available_icon_path": available_icon_path,
                "available_restricted_platform_name": available_restricted_platform_name,
                "presentation_fields_present": any(
                    [
                        available_display_name is not None,
                        available_icon_path is not None,
                        available_restricted_platform_name is not None,
                    ]
                ),
                "available_compatible_engines": available_compatible_engines,
                "available_compatible_engine_count": len(available_compatible_engines),
                "available_engine_api_dependency_keys": (
                    available_engine_api_dependency_keys
                ),
                "available_engine_api_dependency_count": (
                    len(available_engine_api_dependency_keys)
                ),
                "engine_compatibility_fields_present": bool(
                    available_compatible_engines or available_engine_api_dependency_keys
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
                "available_gem_names": enabled_gems if inspection_flags["include_gems"] else [],
                "available_gem_count": len(enabled_gems) if inspection_flags["include_gems"] else 0,
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
                "requested_build_state_evidence": requested_build_state_evidence,
                "build_state_evidence_source": (
                    "simulated_unavailable"
                    if inspection_flags["include_build_state"]
                    else "not-requested"
                ),
                "build_state_selection_mode": (
                    "requested-unavailable"
                    if inspection_flags["include_build_state"]
                    else "not-requested"
                ),
                "build_state_real_path_available": False,
                "requested_build_state_subset_present": False,
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
                "project_root_path": str(resolved_project_root),
                "project_manifest_relative_path": manifest_path_relative_to_project_root,
                "project_manifest_read_mode": "read-only",
                "project_manifest_source_of_truth": "project_root/project.json",
                "project_manifest_workspace_local": manifest_path_within_project_root,
                "project_manifest_within_project_root": manifest_path_within_project_root,
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
                "available_project_origin": available_project_origin,
                "available_project_origin_type": self._json_value_type(
                    available_project_origin
                ),
                "available_project_origin_keys": (
                    sorted(available_project_origin.keys())
                    if isinstance(available_project_origin, dict)
                    else []
                ),
                "project_origin_present": available_project_origin is not None,
                "available_project_id": available_project_id,
                "project_id_present": available_project_id is not None,
                "available_user_tags": available_user_tags,
                "available_user_tag_count": len(available_user_tags),
                "identity_fields_present": any(
                    [
                        available_project_id is not None,
                        len(available_user_tags) > 0,
                    ]
                ),
                "available_display_name": available_display_name,
                "available_icon_path": available_icon_path,
                "available_restricted_platform_name": available_restricted_platform_name,
                "presentation_fields_present": any(
                    [
                        available_display_name is not None,
                        available_icon_path is not None,
                        available_restricted_platform_name is not None,
                    ]
                ),
                "available_compatible_engines": available_compatible_engines,
                "available_compatible_engine_count": len(available_compatible_engines),
                "available_engine_api_dependency_keys": (
                    available_engine_api_dependency_keys
                ),
                "available_engine_api_dependency_count": (
                    len(available_engine_api_dependency_keys)
                ),
                "engine_compatibility_fields_present": bool(
                    available_compatible_engines or available_engine_api_dependency_keys
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
                "available_gem_names": enabled_gems if inspection_flags["include_gems"] else [],
                "available_gem_count": len(enabled_gems) if inspection_flags["include_gems"] else 0,
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
                "requested_build_state_evidence": requested_build_state_evidence,
                "build_state_evidence_source": (
                    "simulated_unavailable"
                    if inspection_flags["include_build_state"]
                    else "not-requested"
                ),
                "build_state_selection_mode": (
                    "requested-unavailable"
                    if inspection_flags["include_build_state"]
                    else "not-requested"
                ),
                "build_state_real_path_available": False,
                "requested_build_state_subset_present": False,
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
        resolved_project_root = Path(project_root).expanduser().resolve()
        manifest_path = resolved_project_root / "project.json"
        if not dry_run:
            simulated = self._simulated.execute(
                request_id="",
                session_id=None,
                workspace_id=None,
                executor_id=None,
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
            simulated.artifact_metadata["fallback_category"] = "dry-run-required"
            simulated.artifact_metadata["fallback_reason"] = (
                "Real build.configure preflight requires dry_run=true."
            )
            simulated.artifact_metadata["project_root_path"] = str(resolved_project_root)
            simulated.artifact_metadata["expected_project_manifest_path"] = str(manifest_path)
            simulated.artifact_metadata["expected_project_manifest_relative_path"] = (
                "project.json"
            )
            simulated.artifact_metadata["project_manifest_source_of_truth"] = (
                "project_root/project.json"
            )
            simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
            simulated.execution_details["real_path_available"] = False
            simulated.execution_details["fallback_category"] = "dry-run-required"
            simulated.execution_details["fallback_reason"] = (
                "Real build.configure preflight requires dry_run=true."
            )
            simulated.execution_details["project_root_path"] = str(resolved_project_root)
            simulated.execution_details["expected_project_manifest_path"] = str(manifest_path)
            simulated.execution_details["expected_project_manifest_relative_path"] = (
                "project.json"
            )
            simulated.execution_details["project_manifest_source_of_truth"] = (
                "project_root/project.json"
            )
            simulated.result_summary = "build.configure fell back to the simulated path."
            return simulated

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
                fallback_category="manifest-missing",
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
                fallback_category="manifest-unreadable",
            )

        project_name = manifest.get("project_name")
        preset = str(args.get("preset", "")).strip() or "default"
        generator = str(args.get("generator", "")).strip() or "unspecified"
        config = str(args.get("config", "")).strip() or "unspecified"
        clean_requested = bool(args.get("clean", False))
        manifest_keys = sorted(str(key) for key in manifest.keys())
        manifest_path_relative_to_project_root = (
            str(manifest_path.relative_to(resolved_project_root))
            if manifest_path.is_relative_to(resolved_project_root)
            else None
        )
        manifest_path_within_project_root = manifest_path_relative_to_project_root is not None
        build_dir = resolved_project_root / "build" / preset
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
                "project_root_path": str(resolved_project_root),
                "project_manifest_path": str(manifest_path),
                "project_manifest_relative_path": manifest_path_relative_to_project_root,
                "project_manifest_read_mode": "read-only",
                "project_manifest_source_of_truth": "project_root/project.json",
                "project_manifest_workspace_local": manifest_path_within_project_root,
                "project_manifest_within_project_root": manifest_path_within_project_root,
                "preflight_execution_mode": "plan-only",
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
                "project_root_path": str(resolved_project_root),
                "project_manifest_path": str(manifest_path),
                "project_manifest_relative_path": manifest_path_relative_to_project_root,
                "project_manifest_read_mode": "read-only",
                "project_manifest_source_of_truth": "project_root/project.json",
                "project_manifest_workspace_local": manifest_path_within_project_root,
                "project_manifest_within_project_root": manifest_path_within_project_root,
                "preflight_execution_mode": "plan-only",
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
        resolved_project_root = Path(project_root).expanduser().resolve()
        manifest_path = resolved_project_root / "project.json"
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
                fallback_category="manifest-missing",
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
                fallback_category="manifest-unreadable",
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
                fallback_category="mutation-not-admitted",
            )
        manifest_path_relative_to_project_root = (
            str(manifest_path.relative_to(resolved_project_root))
            if manifest_path.is_relative_to(resolved_project_root)
            else None
        )
        manifest_path_within_project_root = manifest_path_relative_to_project_root is not None
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
                "project_root_path": str(resolved_project_root),
                "project_manifest_relative_path": manifest_path_relative_to_project_root,
                "project_manifest_read_mode": "read-only",
                "project_manifest_source_of_truth": "project_root/project.json",
                "project_manifest_workspace_local": manifest_path_within_project_root,
                "project_manifest_within_project_root": manifest_path_within_project_root,
            },
            execution_details={
                **details,
                "project_root_path": str(resolved_project_root),
                "project_manifest_relative_path": manifest_path_relative_to_project_root,
                "project_manifest_read_mode": "read-only",
                "project_manifest_source_of_truth": "project_root/project.json",
                "project_manifest_workspace_local": manifest_path_within_project_root,
                "project_manifest_within_project_root": manifest_path_within_project_root,
            },
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
        fallback_category: str = "unavailable",
    ) -> AdapterExecutionReport:
        resolved_project_root = Path(project_root).expanduser().resolve()
        expected_manifest_path = resolved_project_root / "project.json"
        simulated = self._simulated.execute(
            request_id="",
            session_id=None,
            workspace_id=None,
            executor_id=None,
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
        simulated.artifact_metadata["fallback_category"] = fallback_category
        simulated.artifact_metadata["project_root_path"] = str(resolved_project_root)
        simulated.artifact_metadata["expected_project_manifest_path"] = str(
            expected_manifest_path
        )
        simulated.artifact_metadata["expected_project_manifest_relative_path"] = (
            "project.json"
        )
        simulated.artifact_metadata["project_manifest_source_of_truth"] = (
            "project_root/project.json"
        )
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["real_path_available"] = False
        simulated.execution_details["fallback_reason"] = reason
        simulated.execution_details["fallback_category"] = fallback_category
        simulated.execution_details["project_root_path"] = str(resolved_project_root)
        simulated.execution_details["expected_project_manifest_path"] = str(
            expected_manifest_path
        )
        simulated.execution_details["expected_project_manifest_relative_path"] = (
            "project.json"
        )
        simulated.execution_details["project_manifest_source_of_truth"] = (
            "project_root/project.json"
        )
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
        fallback_category: str = "unavailable",
    ) -> AdapterExecutionReport:
        resolved_project_root = Path(project_root).expanduser().resolve()
        expected_manifest_path = resolved_project_root / "project.json"
        simulated = self._simulated.execute(
            request_id="",
            session_id=None,
            workspace_id=None,
            executor_id=None,
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
        simulated.artifact_metadata["fallback_category"] = fallback_category
        simulated.artifact_metadata["fallback_reason"] = reason
        simulated.artifact_metadata["project_root_path"] = str(resolved_project_root)
        simulated.artifact_metadata["expected_project_manifest_path"] = str(
            expected_manifest_path
        )
        simulated.artifact_metadata["expected_project_manifest_relative_path"] = (
            "project.json"
        )
        simulated.artifact_metadata["project_manifest_source_of_truth"] = (
            "project_root/project.json"
        )
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["real_path_available"] = False
        simulated.execution_details["fallback_category"] = fallback_category
        simulated.execution_details["fallback_reason"] = reason
        simulated.execution_details["project_root_path"] = str(resolved_project_root)
        simulated.execution_details["expected_project_manifest_path"] = str(
            expected_manifest_path
        )
        simulated.execution_details["expected_project_manifest_relative_path"] = (
            "project.json"
        )
        simulated.execution_details["project_manifest_source_of_truth"] = (
            "project_root/project.json"
        )
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
        fallback_category: str = "unavailable",
    ) -> AdapterExecutionReport:
        resolved_project_root = Path(project_root).expanduser().resolve()
        expected_manifest_path = resolved_project_root / "project.json"
        simulated = self._simulated.execute(
            request_id="",
            session_id=None,
            workspace_id=None,
            executor_id=None,
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
        simulated.artifact_metadata["fallback_category"] = fallback_category
        simulated.artifact_metadata["fallback_reason"] = reason
        simulated.artifact_metadata["project_root_path"] = str(resolved_project_root)
        simulated.artifact_metadata["expected_project_manifest_path"] = str(
            expected_manifest_path
        )
        simulated.artifact_metadata["expected_project_manifest_relative_path"] = (
            "project.json"
        )
        simulated.artifact_metadata["project_manifest_source_of_truth"] = (
            "project_root/project.json"
        )
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["real_path_available"] = False
        simulated.execution_details["fallback_category"] = fallback_category
        simulated.execution_details["fallback_reason"] = reason
        simulated.execution_details["project_root_path"] = str(resolved_project_root)
        simulated.execution_details["expected_project_manifest_path"] = str(
            expected_manifest_path
        )
        simulated.execution_details["expected_project_manifest_relative_path"] = (
            "project.json"
        )
        simulated.execution_details["project_manifest_source_of_truth"] = (
            "project_root/project.json"
        )
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

    def _manifest_compatible_engines(self, manifest: dict[str, Any]) -> list[str]:
        compatible_engines = manifest.get("compatible_engines")
        if not isinstance(compatible_engines, list):
            return []
        return self._normalized_string_list(compatible_engines)

    def _manifest_origin_value(self, manifest: dict[str, Any]) -> Any | None:
        if "origin" not in manifest:
            return None
        return manifest["origin"]

    def _manifest_string_value(self, manifest: dict[str, Any], key: str) -> str | None:
        value = manifest.get(key)
        if not isinstance(value, str):
            return None
        candidate = value.strip()
        return candidate or None

    def _manifest_string_list_value(self, manifest: dict[str, Any], key: str) -> list[str]:
        value = manifest.get(key)
        if not isinstance(value, list):
            return []
        return self._normalized_string_list(value)

    def _manifest_engine_api_dependency_keys(self, manifest: dict[str, Any]) -> list[str]:
        engine_api_dependencies = manifest.get("engine_api_dependencies")
        if not isinstance(engine_api_dependencies, dict):
            return []
        return sorted(
            key.strip()
            for key in engine_api_dependencies
            if isinstance(key, str) and key.strip()
        )

    def _json_value_type(self, value: Any) -> str:
        if value is None:
            return "null"
        if isinstance(value, bool):
            return "boolean"
        if isinstance(value, str):
            return "string"
        if isinstance(value, dict):
            return "object"
        if isinstance(value, list):
            return "array"
        if isinstance(value, int | float):
            return "number"
        return "unknown"


class ValidationHybridAdapter(ToolExecutionAdapter):
    def __init__(self, *, family: str, mode: str) -> None:
        super().__init__(family=family, mode=mode)
        self._simulated = SimulatedToolExecutionAdapter(family=family, mode=mode)

    def execute(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        if tool == "test.visual.diff":
            return self._execute_test_visual_diff(
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
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
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
            "Hybrid adapter mode is active, but this validation tool still runs "
            "through the simulated path in this phase."
        )
        simulated.logs.append(
            "Hybrid mode did not change execution for this validation tool; "
            "the simulated adapter path remained in use."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        return simulated

    def _execute_test_visual_diff(
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
        baseline_artifact_id = str(args.get("baseline_artifact_id", "")).strip()
        candidate_artifact_id = str(args.get("candidate_artifact_id", "")).strip()
        threshold = args.get("threshold")

        baseline = self._inspect_artifact_file(baseline_artifact_id)
        candidate = self._inspect_artifact_file(candidate_artifact_id)
        visual_metric = self._compute_exact_pixel_match_ratio(
            baseline=baseline,
            candidate=candidate,
        )

        comparison_attempted = bool(baseline.get("sha256")) and bool(candidate.get("sha256"))
        byte_identical = (
            baseline["sha256"] == candidate["sha256"] if comparison_attempted else None
        )
        file_size_delta_bytes = (
            int(candidate["size_bytes"]) - int(baseline["size_bytes"])
            if comparison_attempted
            and isinstance(baseline.get("size_bytes"), int)
            and isinstance(candidate.get("size_bytes"), int)
            else None
        )
        content_type_match = (
            baseline.get("content_type") == candidate.get("content_type")
            if baseline.get("content_type") and candidate.get("content_type")
            else None
        )
        image_like_inputs = bool(baseline.get("image_like")) and bool(candidate.get("image_like"))

        inspection_evidence = [
            "baseline_artifact_lookup",
            "candidate_artifact_lookup",
        ]
        if baseline.get("file_readable") is True:
            inspection_evidence.append("baseline_file_metadata")
        if candidate.get("file_readable") is True:
            inspection_evidence.append("candidate_file_metadata")
        if baseline.get("image_decode_attempted") is True:
            inspection_evidence.append("baseline_image_decode_attempt")
        if candidate.get("image_decode_attempted") is True:
            inspection_evidence.append("candidate_image_decode_attempt")
        if baseline.get("image_decodable") is True:
            inspection_evidence.append("baseline_image_decode")
        if candidate.get("image_decodable") is True:
            inspection_evidence.append("candidate_image_decode")
        if visual_metric["available"] is True:
            inspection_evidence.append("exact_rgba_pixel_match_ratio")
        if comparison_attempted:
            inspection_evidence.extend(
                [
                    "baseline_file_hash",
                    "candidate_file_hash",
                    "artifact_file_identity_comparison",
                ]
            )

        unavailable_evidence: list[str] = []
        if baseline.get("file_readable") is not True:
            unavailable_evidence.append("baseline_file_read")
        if candidate.get("file_readable") is not True:
            unavailable_evidence.append("candidate_file_read")
        if baseline.get("image_decodable") is not True:
            unavailable_evidence.append("baseline_image_decode")
        if candidate.get("image_decodable") is not True:
            unavailable_evidence.append("candidate_image_decode")
        if not comparison_attempted:
            unavailable_evidence.append("comparison")
        if visual_metric["available"] is not True:
            unavailable_evidence.append("visual_metric")

        stronger_metric_reason = str(visual_metric["unavailable_reason"])
        threshold_reason = (
            "Threshold evaluation remains unavailable until a stronger admitted visual diff metric exists."
        )
        comparison_status = (
            "identical"
            if comparison_attempted and byte_identical is True
            else "different"
            if comparison_attempted and byte_identical is False
            else "unavailable"
        )

        logs = [
            "Real test.visual.diff executed through the admitted artifact comparison substrate.",
            f"Baseline artifact lookup status: {baseline['resolution_status']}",
            f"Candidate artifact lookup status: {candidate['resolution_status']}",
        ]
        warnings: list[str] = []
        if baseline.get("warning"):
            warnings.append(str(baseline["warning"]))
            logs.append(str(baseline["warning"]))
        if candidate.get("warning"):
            warnings.append(str(candidate["warning"]))
            logs.append(str(candidate["warning"]))
        if comparison_attempted:
            logs.append(
                "Computed a real file-identity comparison from readable resolved artifact files."
            )
        else:
            logs.append(
                "Comparison evidence remained unavailable because one or both artifact inputs could not be read as local files."
            )
        if baseline.get("image_decodable") is True and candidate.get("image_decodable") is True:
            logs.append(
                "Decoded both artifact inputs through the admitted local image decode substrate."
            )
        else:
            logs.append(
                "Image decode evidence remained partially unavailable for one or both artifact inputs."
            )
        if visual_metric["available"] is True:
            logs.append(
                "Computed an exact RGBA pixel-match ratio for the decoded artifact inputs."
            )
        logs.append(stronger_metric_reason)
        if threshold is not None:
            logs.append(threshold_reason)

        message = (
            "Read-only artifact comparison completed against the admitted local file substrate."
        )
        if comparison_status == "identical":
            message = (
                "Read-only artifact comparison completed and confirmed matching file identity for the requested inputs."
            )
        elif comparison_status == "different":
            message = (
                "Read-only artifact comparison completed and confirmed differing file identity for the requested inputs."
            )

        details = {
            "inspection_surface": "artifact_file_comparison",
            "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
            "simulated": False,
            "adapter_family": self.family,
            "adapter_mode": self.mode,
            "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
            "real_path_available": True,
            "comparison_read_mode": "read-only",
            "baseline_artifact_id": baseline_artifact_id,
            "candidate_artifact_id": candidate_artifact_id,
            "threshold_requested": threshold,
            "threshold_applied": False,
            "threshold_unavailable_reason": threshold_reason if threshold is not None else None,
            "inspection_evidence": inspection_evidence,
            "unavailable_evidence": unavailable_evidence,
            "baseline_resolution_status": baseline["resolution_status"],
            "baseline_artifact_found": baseline["artifact_found"],
            "baseline_local_path_resolved": baseline["resolved_path"],
            "baseline_file_exists": baseline["file_exists"],
            "baseline_file_readable": baseline["file_readable"],
            "baseline_content_type": baseline["content_type"],
            "baseline_extension": baseline["extension"],
            "baseline_size_bytes": baseline["size_bytes"],
            "baseline_sha256": baseline["sha256"],
            "baseline_image_decode_attempted": baseline["image_decode_attempted"],
            "baseline_image_decode_substrate_available": baseline[
                "image_decode_substrate_available"
            ],
            "baseline_image_decode_status": baseline["image_decode_status"],
            "baseline_image_decodable": baseline["image_decodable"],
            "baseline_image_width": baseline["image_width"],
            "baseline_image_height": baseline["image_height"],
            "baseline_image_mode": baseline["image_mode"],
            "baseline_image_channel_count": baseline["image_channel_count"],
            "baseline_image_decode_unavailable_reason": baseline[
                "image_decode_unavailable_reason"
            ],
            "candidate_resolution_status": candidate["resolution_status"],
            "candidate_artifact_found": candidate["artifact_found"],
            "candidate_local_path_resolved": candidate["resolved_path"],
            "candidate_file_exists": candidate["file_exists"],
            "candidate_file_readable": candidate["file_readable"],
            "candidate_content_type": candidate["content_type"],
            "candidate_extension": candidate["extension"],
            "candidate_size_bytes": candidate["size_bytes"],
            "candidate_sha256": candidate["sha256"],
            "candidate_image_decode_attempted": candidate["image_decode_attempted"],
            "candidate_image_decode_substrate_available": candidate[
                "image_decode_substrate_available"
            ],
            "candidate_image_decode_status": candidate["image_decode_status"],
            "candidate_image_decodable": candidate["image_decodable"],
            "candidate_image_width": candidate["image_width"],
            "candidate_image_height": candidate["image_height"],
            "candidate_image_mode": candidate["image_mode"],
            "candidate_image_channel_count": candidate["image_channel_count"],
            "candidate_image_decode_unavailable_reason": candidate[
                "image_decode_unavailable_reason"
            ],
            "decoded_image_inputs": bool(baseline["image_decodable"])
            and bool(candidate["image_decodable"]),
            "comparison_attempted": comparison_attempted,
            "comparison_available": comparison_attempted,
            "comparison_method": "sha256-file-identity" if comparison_attempted else None,
            "comparison_status": comparison_status,
            "byte_identical": byte_identical,
            "file_size_delta_bytes": file_size_delta_bytes,
            "content_type_match": content_type_match,
            "image_like_inputs": image_like_inputs,
            "visual_metric_input_compatible": visual_metric["input_compatible"],
            "visual_metric_color_space": visual_metric["color_space"],
            "visual_metric_total_pixels": visual_metric["total_pixels"],
            "visual_metric_matching_pixels": visual_metric["matching_pixels"],
            "visual_metric_mismatched_pixels": visual_metric["mismatched_pixels"],
            "visual_metric_available": visual_metric["available"],
            "visual_metric_name": visual_metric["name"],
            "visual_metric_value": visual_metric["value"],
            "visual_metric_unavailable_reason": stronger_metric_reason,
        }
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
            logs=logs,
            artifact_label="Real artifact comparison evidence",
            artifact_kind="artifact_comparison_result",
            artifact_uri="artifact-diff://runs/{run_id}/executions/{execution_id}/comparison",
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                **details,
            },
            execution_details=details,
            result_summary="Real artifact comparison substrate completed successfully.",
        )

    def _inspect_artifact_file(self, artifact_id: str) -> dict[str, Any]:
        artifact = artifacts_service.get_artifact(artifact_id)
        if artifact is None:
            return {
                "artifact_found": False,
                "resolution_status": "artifact-missing",
                "resolved_path": None,
                "file_exists": False,
                "file_readable": False,
                "content_type": None,
                "extension": None,
                "size_bytes": None,
                "sha256": None,
                "image_like": False,
                **self._image_decode_not_attempted(
                    "Image decode was not attempted because the artifact record was missing."
                ),
                "warning": f"Artifact '{artifact_id}' was not found in the control-plane store.",
            }

        resolved_path = self._artifact_local_path(artifact.path, artifact.uri)
        if resolved_path is None:
            return {
                "artifact_found": True,
                "resolution_status": "no-local-file-path",
                "resolved_path": None,
                "file_exists": False,
                "file_readable": False,
                "content_type": artifact.content_type,
                "extension": None,
                "size_bytes": None,
                "sha256": None,
                "image_like": bool(
                    isinstance(artifact.content_type, str)
                    and artifact.content_type.startswith("image/")
                ),
                **self._image_decode_not_attempted(
                    "Image decode was not attempted because the artifact had no admitted local file path."
                ),
                "warning": (
                    f"Artifact '{artifact_id}' has no admitted local file path or file URI to compare."
                ),
            }

        try:
            exists = resolved_path.exists()
        except OSError as exc:
            return {
                "artifact_found": True,
                "resolution_status": "path-unavailable",
                "resolved_path": str(resolved_path),
                "file_exists": False,
                "file_readable": False,
                "content_type": artifact.content_type,
                "extension": resolved_path.suffix or None,
                "size_bytes": None,
                "sha256": None,
                "image_like": self._is_image_like(
                    content_type=artifact.content_type,
                    path=resolved_path,
                ),
                **self._image_decode_not_attempted(
                    "Image decode was not attempted because the artifact path could not be inspected."
                ),
                "warning": f"Artifact '{artifact_id}' path could not be inspected: {exc}",
            }

        if not exists:
            return {
                "artifact_found": True,
                "resolution_status": "missing-on-disk",
                "resolved_path": str(resolved_path),
                "file_exists": False,
                "file_readable": False,
                "content_type": artifact.content_type,
                "extension": resolved_path.suffix or None,
                "size_bytes": None,
                "sha256": None,
                "image_like": self._is_image_like(
                    content_type=artifact.content_type,
                    path=resolved_path,
                ),
                **self._image_decode_not_attempted(
                    "Image decode was not attempted because the resolved artifact file was missing on disk."
                ),
                "warning": f"Artifact '{artifact_id}' resolved to a missing local file.",
            }

        if not resolved_path.is_file():
            return {
                "artifact_found": True,
                "resolution_status": "resolved-non-file",
                "resolved_path": str(resolved_path),
                "file_exists": True,
                "file_readable": False,
                "content_type": artifact.content_type,
                "extension": resolved_path.suffix or None,
                "size_bytes": None,
                "sha256": None,
                "image_like": self._is_image_like(
                    content_type=artifact.content_type,
                    path=resolved_path,
                ),
                **self._image_decode_not_attempted(
                    "Image decode was not attempted because the resolved artifact path was not a file."
                ),
                "warning": f"Artifact '{artifact_id}' resolved locally but not as a file.",
            }

        try:
            size_bytes = resolved_path.stat().st_size
            sha256 = hashlib.sha256(resolved_path.read_bytes()).hexdigest()
        except OSError as exc:
            return {
                "artifact_found": True,
                "resolution_status": "read-failed",
                "resolved_path": str(resolved_path),
                "file_exists": True,
                "file_readable": False,
                "content_type": artifact.content_type,
                "extension": resolved_path.suffix or None,
                "size_bytes": None,
                "sha256": None,
                "image_like": self._is_image_like(
                    content_type=artifact.content_type,
                    path=resolved_path,
                ),
                **self._image_decode_not_attempted(
                    "Image decode was not attempted because the resolved artifact file could not be read."
                ),
                "warning": f"Artifact '{artifact_id}' could not be read from disk: {exc}",
            }

        content_type = artifact.content_type or mimetypes.guess_type(str(resolved_path))[0]
        return {
            "artifact_found": True,
            "resolution_status": "resolved-file",
            "resolved_path": str(resolved_path),
            "file_exists": True,
            "file_readable": True,
            "content_type": content_type,
            "extension": resolved_path.suffix or None,
            "size_bytes": size_bytes,
            "sha256": sha256,
            "image_like": self._is_image_like(content_type=content_type, path=resolved_path),
            **self._decode_image_file(resolved_path),
            "warning": None,
        }

    def _image_decode_not_attempted(self, reason: str) -> dict[str, Any]:
        return {
            "image_decode_attempted": False,
            "image_decode_substrate_available": Image is not None,
            "image_decode_status": "not-attempted",
            "image_decodable": False,
            "image_width": None,
            "image_height": None,
            "image_mode": None,
            "image_channel_count": None,
            "image_decode_unavailable_reason": reason,
        }

    def _decode_image_file(self, resolved_path: Path) -> dict[str, Any]:
        if Image is None:
            return {
                "image_decode_attempted": False,
                "image_decode_substrate_available": False,
                "image_decode_status": "decode-substrate-unavailable",
                "image_decodable": False,
                "image_width": None,
                "image_height": None,
                "image_mode": None,
                "image_channel_count": None,
                "image_decode_unavailable_reason": (
                    "The admitted image decode substrate is unavailable because Pillow is not installed."
                ),
            }

        try:
            with Image.open(resolved_path) as image:
                image.load()
                bands = image.getbands()
                return {
                    "image_decode_attempted": True,
                    "image_decode_substrate_available": True,
                    "image_decode_status": "decoded",
                    "image_decodable": True,
                    "image_width": image.width,
                    "image_height": image.height,
                    "image_mode": image.mode,
                    "image_channel_count": len(bands) if bands else None,
                    "image_decode_unavailable_reason": None,
                }
        except UnidentifiedImageError:
            return {
                "image_decode_attempted": True,
                "image_decode_substrate_available": True,
                "image_decode_status": "unsupported-or-not-image",
                "image_decodable": False,
                "image_width": None,
                "image_height": None,
                "image_mode": None,
                "image_channel_count": None,
                "image_decode_unavailable_reason": (
                    "The resolved file is readable but is not decodable as an admitted image input by the current substrate."
                ),
            }
        except OSError as exc:
            return {
                "image_decode_attempted": True,
                "image_decode_substrate_available": True,
                "image_decode_status": "decode-failed",
                "image_decodable": False,
                "image_width": None,
                "image_height": None,
                "image_mode": None,
                "image_channel_count": None,
                "image_decode_unavailable_reason": (
                    f"The resolved file could not be decoded by the current admitted image substrate: {exc}"
                ),
            }

    def _compute_exact_pixel_match_ratio(
        self,
        *,
        baseline: dict[str, Any],
        candidate: dict[str, Any],
    ) -> dict[str, Any]:
        unavailable_result = {
            "available": False,
            "name": None,
            "value": None,
            "input_compatible": False,
            "color_space": None,
            "total_pixels": None,
            "matching_pixels": None,
            "mismatched_pixels": None,
            "unavailable_reason": (
                "No admitted real pixel-diff or perceptual image-diff substrate is available in this slice."
            ),
        }
        if baseline.get("image_decodable") is not True or candidate.get("image_decodable") is not True:
            unavailable_result["unavailable_reason"] = (
                "Exact RGBA pixel matching is unavailable because one or both inputs were not decodable images."
            )
            return unavailable_result

        baseline_width = baseline.get("image_width")
        baseline_height = baseline.get("image_height")
        candidate_width = candidate.get("image_width")
        candidate_height = candidate.get("image_height")
        if (
            not isinstance(baseline_width, int)
            or not isinstance(baseline_height, int)
            or not isinstance(candidate_width, int)
            or not isinstance(candidate_height, int)
        ):
            unavailable_result["unavailable_reason"] = (
                "Exact RGBA pixel matching is unavailable because decoded image dimensions were not fully available."
            )
            return unavailable_result
        if (baseline_width, baseline_height) != (candidate_width, candidate_height):
            unavailable_result["unavailable_reason"] = (
                "Exact RGBA pixel matching is unavailable because the decoded inputs do not share the same dimensions."
            )
            return unavailable_result

        baseline_path = baseline.get("resolved_path")
        candidate_path = candidate.get("resolved_path")
        if not isinstance(baseline_path, str) or not isinstance(candidate_path, str):
            unavailable_result["unavailable_reason"] = (
                "Exact RGBA pixel matching is unavailable because one or both decoded inputs had no admitted local file path."
            )
            return unavailable_result

        try:
            with Image.open(Path(baseline_path)) as baseline_image:
                with Image.open(Path(candidate_path)) as candidate_image:
                    baseline_rgba = baseline_image.convert("RGBA")
                    candidate_rgba = candidate_image.convert("RGBA")
                    baseline_pixels = baseline_rgba.getdata()
                    candidate_pixels = candidate_rgba.getdata()
                    total_pixels = baseline_rgba.width * baseline_rgba.height
                    matching_pixels = sum(
                        1
                        for baseline_pixel, candidate_pixel in zip(
                            baseline_pixels,
                            candidate_pixels,
                            strict=True,
                        )
                        if baseline_pixel == candidate_pixel
                    )
        except OSError as exc:
            unavailable_result["unavailable_reason"] = (
                "Exact RGBA pixel matching could not complete on the decoded inputs: "
                f"{exc}"
            )
            return unavailable_result

        mismatched_pixels = total_pixels - matching_pixels
        return {
            "available": True,
            "name": "exact_rgba_pixel_match_ratio",
            "value": matching_pixels / total_pixels if total_pixels else None,
            "input_compatible": True,
            "color_space": "RGBA",
            "total_pixels": total_pixels,
            "matching_pixels": matching_pixels,
            "mismatched_pixels": mismatched_pixels,
            "unavailable_reason": (
                "No admitted real pixel-diff or perceptual image-diff substrate is available in this slice."
            ),
        }

    def _artifact_local_path(self, artifact_path: str | None, artifact_uri: str | None) -> Path | None:
        if artifact_path:
            return Path(artifact_path).expanduser()
        if not artifact_uri:
            return None
        parsed = urlparse(artifact_uri)
        if parsed.scheme != "file":
            return None
        uri_path = unquote(parsed.path or "")
        if parsed.netloc and not uri_path.startswith("//"):
            uri_path = f"//{parsed.netloc}{uri_path}"
        if os.name == "nt" and len(uri_path) >= 3 and uri_path.startswith("/") and uri_path[2] == ":":
            uri_path = uri_path[1:]
        return Path(uri_path).expanduser()

    def _is_image_like(self, *, content_type: str | None, path: Path | None) -> bool:
        if isinstance(content_type, str) and content_type.startswith("image/"):
            return True
        if path is None:
            return False
        return path.suffix.lower() in {
            ".png",
            ".jpg",
            ".jpeg",
            ".bmp",
            ".tif",
            ".tiff",
            ".tga",
            ".gif",
            ".webp",
            ".dds",
        }


class RenderLookdevHybridAdapter(ToolExecutionAdapter):
    def __init__(self, *, family: str, mode: str) -> None:
        super().__init__(family=family, mode=mode)
        self._simulated = SimulatedToolExecutionAdapter(family=family, mode=mode)

    def execute(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        if tool == "render.capture.viewport":
            return self._execute_render_capture_viewport(
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                tool=tool,
                agent=agent,
                project_root=project_root,
                engine_root=engine_root,
                dry_run=dry_run,
                args=args,
                approval_class=approval_class,
                locks_acquired=locks_acquired,
            )
        if tool == "render.material.inspect":
            return self._execute_render_material_inspect(
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
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
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
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
            "Hybrid adapter mode is active, but this render-lookdev tool still runs "
            "through the simulated path in this phase."
        )
        simulated.logs.append(
            "Hybrid mode did not change execution for this render-lookdev tool; "
            "the simulated adapter path remained in use."
        )
        simulated.artifact_metadata["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        simulated.execution_details["execution_boundary"] = HYBRID_EXECUTION_BOUNDARY
        return simulated

    def _execute_render_capture_viewport(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        runtime_probe = editor_automation_runtime_service.execute_render_capture_viewport(
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            args=args,
            locks_acquired=locks_acquired,
        )
        runtime_result = runtime_probe.get("runtime_result", {})
        if not isinstance(runtime_result, dict):
            runtime_result = {}

        runtime_available = bool(runtime_result.get("runtime_available"))
        capture_attempted = bool(runtime_result.get("capture_attempted"))
        capture_artifact_produced = bool(runtime_result.get("capture_artifact_produced"))
        capture_unavailable_reason = str(
            runtime_result.get(
                "capture_unavailable_reason",
                "No admitted real screenshot production path is available in this slice.",
            )
        )

        inspection_evidence = ["runtime_probe_attempt"]
        unavailable_evidence: list[str] = []
        logs = [
            "Real render.capture.viewport executed through the admitted editor runtime probe substrate.",
            f"Runtime probe method: {runtime_result.get('runtime_probe_method', 'editor-runtime-get-context')}",
        ]
        if runtime_available:
            inspection_evidence.append("runtime_context_readback")
            logs.append("Render capture runtime context was available in the admitted editor substrate.")
        else:
            unavailable_evidence.append("runtime")
            logs.append("Render capture runtime evidence remained unavailable in this editor context.")
        if capture_attempted:
            inspection_evidence.append("capture_attempt")
        else:
            unavailable_evidence.append("capture_attempt")
        if capture_artifact_produced:
            inspection_evidence.append("capture_artifact")
        else:
            unavailable_evidence.append("capture_artifact")
        logs.append(capture_unavailable_reason)

        requested_resolution = runtime_result.get("requested_resolution")
        if not isinstance(requested_resolution, dict):
            requested_resolution = args.get("resolution")
        details = {
            "inspection_surface": "render_capture_runtime_probe",
            "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
            "simulated": False,
            "adapter_family": self.family,
            "adapter_mode": self.mode,
            "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
            "real_path_available": True,
            "capture_request_explicit": True,
            "comparison_read_mode": "read-only",
            "runtime_probe_attempted": bool(runtime_result.get("runtime_probe_attempted", True)),
            "runtime_probe_method": runtime_result.get("runtime_probe_method"),
            "runtime_available": runtime_available,
            "capture_runtime_mode": runtime_result.get("capture_runtime_mode"),
            "capture_operation_available": bool(
                runtime_result.get("capture_operation_available", False)
            ),
            "capture_attempted": capture_attempted,
            "capture_artifact_produced": capture_artifact_produced,
            "capture_artifact_path": runtime_result.get("capture_artifact_path"),
            "capture_artifact_content_type": runtime_result.get(
                "capture_artifact_content_type"
            ),
            "capture_artifact_size_bytes": runtime_result.get("capture_artifact_size_bytes"),
            "capture_unavailable_reason": capture_unavailable_reason,
            "output_label": runtime_result.get("output_label") or args.get("output_label"),
            "camera_entity_id": runtime_result.get("camera_entity_id")
            or args.get("camera_entity_id"),
            "requested_resolution": requested_resolution,
            "active_level_path": runtime_result.get("active_level_path"),
            "inspection_evidence": inspection_evidence,
            "unavailable_evidence": unavailable_evidence,
            **{
                key: runtime_result[key]
                for key in (
                    "bridge_name",
                    "bridge_version",
                    "bridge_available",
                    "bridge_operation",
                    "bridge_contract_version",
                    "bridge_command_id",
                    "bridge_result_summary",
                    "bridge_error_code",
                    "bridge_heartbeat_seen_at",
                    "bridge_queue_mode",
                    "bridge_selected_entity_count",
                    "bridge_prefab_context_notes",
                    "editor_transport",
                    "editor_log_path",
                )
                if key in runtime_result
            },
        }
        message = str(
            runtime_result.get(
                "message",
                "Viewport capture substrate probe completed against the admitted editor runtime path.",
            )
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
            warnings=[],
            logs=logs,
            artifact_label="Render capture substrate evidence",
            artifact_kind="render_capture_probe_result",
            artifact_uri="render-capture-probe://runs/{run_id}/executions/{execution_id}/probe",
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                **details,
            },
            execution_details=details,
            result_summary="Real render capture substrate probe completed successfully.",
        )

    def _execute_render_material_inspect(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        tool: str,
        agent: str,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        approval_class: str,
        locks_acquired: list[str],
    ) -> AdapterExecutionReport:
        runtime_probe = editor_automation_runtime_service.execute_render_material_inspect(
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            project_root=project_root,
            engine_root=engine_root,
            dry_run=dry_run,
            args=args,
            locks_acquired=locks_acquired,
        )
        runtime_result = runtime_probe.get("runtime_result", {})
        if not isinstance(runtime_result, dict):
            runtime_result = {}

        runtime_available = bool(runtime_result.get("runtime_available"))
        material_inspection_attempted = bool(
            runtime_result.get("material_inspection_attempted")
        )
        material_evidence_produced = bool(runtime_result.get("material_evidence_produced"))
        material_unavailable_reason = str(
            runtime_result.get(
                "material_unavailable_reason",
                "No admitted real material inspection path is available in this slice.",
            )
        )

        inspection_evidence = ["runtime_probe_attempt"]
        unavailable_evidence: list[str] = []
        logs = [
            "Real render.material.inspect executed through the admitted editor runtime probe substrate.",
            f"Runtime probe method: {runtime_result.get('runtime_probe_method', 'editor-runtime-get-context')}",
        ]
        if runtime_available:
            inspection_evidence.append("runtime_context_readback")
            logs.append("Material inspection runtime context was available in the admitted editor substrate.")
        else:
            unavailable_evidence.append("runtime")
            logs.append("Material inspection runtime evidence remained unavailable in this editor context.")
        if material_inspection_attempted:
            inspection_evidence.append("material_inspection_attempt")
        else:
            unavailable_evidence.append("material_inspection_attempt")
        if material_evidence_produced:
            inspection_evidence.append("material_evidence")
        else:
            unavailable_evidence.append("material_evidence")
        logs.append(material_unavailable_reason)

        details = {
            "inspection_surface": "render_material_runtime_probe",
            "execution_boundary": HYBRID_EXECUTION_BOUNDARY,
            "simulated": False,
            "adapter_family": self.family,
            "adapter_mode": self.mode,
            "adapter_contract_version": ADAPTER_CONTRACT_VERSION,
            "real_path_available": True,
            "material_request_explicit": True,
            "inspection_read_mode": "read-only",
            "runtime_probe_attempted": bool(runtime_result.get("runtime_probe_attempted", True)),
            "runtime_probe_method": runtime_result.get("runtime_probe_method"),
            "runtime_available": runtime_available,
            "material_runtime_mode": runtime_result.get("material_runtime_mode"),
            "material_operation_available": bool(
                runtime_result.get("material_operation_available", False)
            ),
            "material_inspection_attempted": material_inspection_attempted,
            "material_evidence_produced": material_evidence_produced,
            "material_evidence_path": runtime_result.get("material_evidence_path"),
            "material_unavailable_reason": material_unavailable_reason,
            "material_path": runtime_result.get("material_path") or args.get("material_path"),
            "include_shader_data_requested": bool(
                runtime_result.get(
                    "include_shader_data_requested",
                    args.get("include_shader_data"),
                )
            ),
            "include_references_requested": bool(
                runtime_result.get(
                    "include_references_requested",
                    args.get("include_references"),
                )
            ),
            "active_level_path": runtime_result.get("active_level_path"),
            "inspection_evidence": inspection_evidence,
            "unavailable_evidence": unavailable_evidence,
            **{
                key: runtime_result[key]
                for key in (
                    "bridge_name",
                    "bridge_version",
                    "bridge_available",
                    "bridge_operation",
                    "bridge_contract_version",
                    "bridge_command_id",
                    "bridge_result_summary",
                    "bridge_error_code",
                    "bridge_heartbeat_seen_at",
                    "bridge_queue_mode",
                    "bridge_selected_entity_count",
                    "bridge_prefab_context_notes",
                    "editor_transport",
                    "editor_log_path",
                )
                if key in runtime_result
            },
        }
        message = str(
            runtime_result.get(
                "message",
                "Material inspection substrate probe completed against the admitted editor runtime path.",
            )
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
            warnings=[],
            logs=logs,
            artifact_label="Render material substrate evidence",
            artifact_kind="render_material_probe_result",
            artifact_uri="render-material-probe://runs/{run_id}/executions/{execution_id}/probe",
            artifact_metadata={
                "tool": tool,
                "agent": agent,
                "execution_mode": "real",
                **details,
            },
            execution_details=details,
            result_summary="Real render material substrate probe completed successfully.",
        )


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
            family_real = {
                tool_name
                for tool_name in self._real_tool_paths_for_mode(active_mode)
                if tool_name.startswith(("project.", "build.", "settings.", "gem."))
            }
            family_plan_only = set(self._plan_only_tool_paths_for_mode(active_mode))
        if active_mode == "hybrid" and family == "asset-pipeline":
            family_real = {
                tool_name
                for tool_name in self._real_tool_paths_for_mode(active_mode)
                if tool_name.startswith("asset.")
            }
        if active_mode == "hybrid" and family == "editor-control":
            family_real = {
                tool_name
                for tool_name in self._real_tool_paths_for_mode(active_mode)
                if tool_name.startswith("editor.")
            }
        if active_mode == "hybrid" and family == "validation":
            family_real = {
                tool_name
                for tool_name in self._real_tool_paths_for_mode(active_mode)
                if tool_name.startswith("test.")
            }
        if active_mode == "hybrid" and family == "render-lookdev":
            family_real = {
                tool_name
                for tool_name in self._real_tool_paths_for_mode(active_mode)
                if tool_name.startswith("render.")
            }
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
            if configured_mode == "hybrid" and agent.id == "asset-pipeline":
                registry[agent.id] = AssetPipelineHybridAdapter(
                    family=agent.id,
                    mode=configured_mode,
                )
            elif configured_mode == "hybrid" and agent.id == "project-build":
                registry[agent.id] = ProjectBuildHybridAdapter(
                    family=agent.id,
                    mode=configured_mode,
                )
            elif configured_mode == "hybrid" and agent.id == "editor-control":
                registry[agent.id] = EditorControlHybridAdapter(
                    family=agent.id,
                    mode=configured_mode,
                )
            elif configured_mode == "hybrid" and agent.id == "validation":
                registry[agent.id] = ValidationHybridAdapter(
                    family=agent.id,
                    mode=configured_mode,
                )
            elif configured_mode == "hybrid" and agent.id == "render-lookdev":
                registry[agent.id] = RenderLookdevHybridAdapter(
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
                    "Hybrid mode now includes a narrow admitted subset of real O3DE adapters.",
                    "Hybrid mode currently enables a real read-only asset.source.inspect "
                    "path for explicit project-local source files, a real read-only "
                    "asset.processor.status host runtime probe, a real read-only "
                    "render.capture.viewport explicit runtime probe substrate, a real read-only "
                    "render.material.inspect explicit runtime probe substrate, a real read-only "
                    "test.visual.diff explicit artifact comparison substrate, a real read-only "
                    "project.inspect path, admitted real editor session/level runtime paths, "
                    "an admitted real root-level editor.entity.create path on "
                    "McpSandbox, an admitted allowlist-bound editor.component.add "
                    "path on McpSandbox, and an admitted explicit "
                    "editor.component.property.get read path on McpSandbox, "
                    "a real plan-only build.configure preflight path, and a real "
                    "dry-run-only settings.patch preflight path.",
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
                    "Hybrid mode enables a real read-only asset.processor.status path when "
                    "host process visibility is available, with job and platform evidence "
                    "kept explicit when unavailable.",
                    "Hybrid mode enables a real read-only asset.source.inspect path when "
                    "the explicit source path resolves within the current project root.",
                    "Hybrid mode enables a real read-only project.inspect path when its "
                    "manifest preconditions are satisfied.",
                    "Hybrid mode enables a real read-only render.capture.viewport substrate "
                    "when an explicit capture request reaches the admitted editor runtime probe path.",
                    "Hybrid mode enables a real read-only render.material.inspect substrate "
                    "when an explicit material inspection request reaches the admitted editor runtime probe path.",
                    "Hybrid mode enables a real read-only test.visual.diff substrate "
                    "when both requested artifact ids resolve to admitted local files.",
                    "Hybrid mode also enables admitted real editor runtime paths for "
                    "editor.session.open, editor.level.open, editor.entity.create, "
                    "the allowlist-bound editor.component.add path, and the explicit "
                    "editor.component.property.get read path when editor preflight "
                    "requirements are satisfied.",
                    "Hybrid mode also enables a real plan-only build.configure "
                    "preflight path when dry_run=true and manifest preconditions are "
                    "satisfied.",
                    "Hybrid mode also enables a real dry-run-only settings.patch "
                    "preflight path when manifest-backed settings admission criteria "
                    "are satisfied.",
                    "All other tools remain simulated in this phase.",
                    "Wider O3DE mutation surfaces remain explicitly out of scope in this phase.",
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
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
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
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
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
                runtime_status.active_mode == "hybrid"
                and family
                in {"asset-pipeline", "project-build", "editor-control", "validation", "render-lookdev"}
            )
            family_real_tool_paths = (
                [
                    tool_name
                    for tool_name in runtime_status.real_tool_paths
                    if (
                        family == "asset-pipeline"
                        and tool_name.startswith("asset.")
                    )
                    or (
                        family == "project-build"
                        and tool_name.startswith(("project.", "build.", "settings.", "gem."))
                    )
                    or (family == "editor-control" and tool_name.startswith("editor."))
                    or (family == "validation" and tool_name.startswith("test."))
                    or (family == "render-lookdev" and tool_name.startswith("render."))
                ]
                if family_supports_real
                else []
            )
            family_plan_only_tool_paths = (
                [
                    tool_name
                    for tool_name in runtime_status.plan_only_tool_paths
                    if family == "project-build"
                ]
                if family_supports_real
                else []
            )
            family_simulated_tool_paths = self._simulated_tool_paths_for_family(
                family=family,
                active_mode=runtime_status.active_mode,
            )
            family_notes = list(runtime_status.notes)
            if family_supports_real:
                if family == "project-build":
                    family_notes.append(
                        "project.inspect currently has a real read-only path and "
                        "build.configure and settings.patch currently have real "
                        "preflight-only paths in this family."
                    )
                if family == "asset-pipeline":
                    family_notes.append(
                    "asset.processor.status and asset.source.inspect currently have "
                    "real read-only admitted paths in this family."
                )
                if family == "editor-control":
                    family_notes.append(
                        "editor.session.open, editor.level.open, "
                        "editor.entity.create, editor.component.add, and "
                        "editor.component.property.get currently have admitted real "
                        "runtime-owned editor paths in this family."
                    )
                if family == "validation":
                    family_notes.append(
                        "test.visual.diff currently has a real read-only admitted "
                        "artifact comparison substrate in this family."
                    )
                if family == "render-lookdev":
                    family_notes.append(
                        "render.capture.viewport and render.material.inspect currently have "
                        "real read-only admitted runtime probe substrates in this family."
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
