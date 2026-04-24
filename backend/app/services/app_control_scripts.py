from hashlib import sha1
from typing import Any

from app.models.app_control import (
    AppControlBackupPlan,
    AppControlExecutionReport,
    AppControlExecutionReportItem,
    AppControlExecutionReportRequest,
    AppControlOperation,
    AppControlPreviewRequest,
    AppControlReportMode,
    AppControlScriptPreview,
)
from app.models.control_plane import EventSeverity
from app.services.events import events_service


WORKSPACE_TARGETS = {
    "home": ("home", ["home", "start", "start here", "launchpad"]),
    "prompt": ("prompt", ["prompt", "prompt studio", "natural language"]),
    "builder": (
        "builder",
        [
            "builder",
            "mission control",
            "worktree",
            "threads",
            "agent",
            "agent profile",
            "personality",
            "identity",
            "soul",
            "memory",
            "bootstrap",
            "avatar",
            "source upload",
            "context source",
            "openclaw",
        ],
    ),
    "operations": ("operations", ["operations", "command center", "approvals", "dispatch"]),
    "runtime": ("runtime", ["runtime", "bridge", "status", "health"]),
    "records": ("records", ["records", "runs", "executions", "artifacts"]),
}

BLOCKED_TERMS = [
    "powershell",
    "cmd.exe",
    "shell",
    "delete",
    "format",
    "remove-item",
    "rm -",
    "registry",
    "token",
    "password",
    "secret",
]

ADMITTED_SETTINGS_TARGETS = [
    "appearance.themeMode",
    "appearance.density",
    "appearance.contentMaxWidth",
    "layout.showDesktopTelemetry",
    "layout.guidedMode",
]


class AppControlScriptService:
    """Builds safe, reversible app-control previews from operator instructions.

    This deliberately returns a typed app script, not arbitrary executable code.
    Later LLM integrations can produce the same contract, but the execution
    boundary remains the allowlisted operation set.
    """

    def preview_script(self, request: AppControlPreviewRequest) -> AppControlScriptPreview:
        instruction = request.instruction.strip()
        normalized = instruction.lower()
        warnings = self._blocked_warnings(normalized)
        operations = [] if warnings else self._build_operations(normalized)
        script_id = self._script_id(instruction, operations)

        if not operations:
            return AppControlScriptPreview(
                script_id=script_id,
                status="no_supported_action",
                instruction=instruction,
                summary=(
                    "No safe app-control operation was generated. The request either needs a clearer "
                    "app-setting/navigation target or includes terms that require a human/code review path."
                ),
                risk_level="medium" if warnings else "low",
                backup=AppControlBackupPlan(
                    captures=["settings profile", "active workspace"],
                ),
                operations=[],
                warnings=warnings or [
                    "Only app settings and workspace navigation are admitted in this preview slice.",
                ],
                actor=request.actor,
            )

        return AppControlScriptPreview(
            script_id=script_id,
            status="ready",
            instruction=instruction,
            summary=self._summary(operations, request.actor.display_name if request.actor else None),
            risk_level="low",
            backup=AppControlBackupPlan(
                captures=["settings profile", "active workspace", "acting agent identity"],
            ),
            operations=operations,
            warnings=[
                "This preview does not execute shell commands, edit files, call O3DE, or mutate backend runtime state.",
                "The frontend must snapshot current app settings and active workspace before execution.",
                "Agent actor metadata is advisory; the user approval gate remains the authority before execution.",
            ],
            actor=request.actor,
        )

    def build_execution_report(self, request: AppControlExecutionReportRequest) -> AppControlExecutionReport:
        if request.mode == "applied":
            items = [self._report_item_for_operation(operation, request) for operation in request.operations]
            summary = (
                f"Applied {len(request.operations)} planned operation(s). "
                "Verified results are marked explicitly below."
            )
            persisted_event = self._record_report_event(
                script_id=request.script_id,
                mode="applied",
                summary=summary,
                items=items,
                workspace_id=request.workspace_after or request.workspace_before,
            )
            return AppControlExecutionReport(
                script_id=request.script_id,
                mode="applied",
                summary=summary,
                items=items,
                event_id=persisted_event.id,
            )

        items = [
            self._report_item_for_revert_settings(request),
            self._report_item_for_revert_workspace(request),
        ]
        summary = "Requested restore of the last saved App OS backup. Verified results are marked explicitly below."
        persisted_event = self._record_report_event(
            script_id=request.script_id,
            mode="reverted",
            summary=summary,
            items=items,
            workspace_id=request.backup_workspace_id or request.workspace_after or request.workspace_before,
        )
        return AppControlExecutionReport(
            script_id=request.script_id,
            mode="reverted",
            summary=summary,
            items=items,
            event_id=persisted_event.id,
        )

    def _build_operations(self, normalized: str) -> list[AppControlOperation]:
        operations: list[AppControlOperation] = []

        def add_setting(operation_id: str, target: str, value: Any, description: str) -> None:
            if not any(operation.target == target and operation.value == value for operation in operations):
                operations.append(
                    AppControlOperation(
                        operation_id=operation_id,
                        kind="settings.patch",
                        target=target,
                        value=value,
                        description=description,
                    )
                )

        if "dark" in normalized:
            add_setting("set-theme-dark", "appearance.themeMode", "dark", "Set the app theme mode to dark.")
        elif "light" in normalized:
            add_setting("set-theme-light", "appearance.themeMode", "light", "Set the app theme mode to light.")
        elif "system theme" in normalized or "use system" in normalized:
            add_setting("set-theme-system", "appearance.themeMode", "system", "Follow the operating system theme.")

        if "compact" in normalized:
            add_setting("set-density-compact", "appearance.density", "compact", "Use compact app spacing.")
        elif "comfortable" in normalized:
            add_setting("set-density-comfortable", "appearance.density", "comfortable", "Use comfortable app spacing.")

        if "full width" in normalized or "wide open" in normalized:
            add_setting("set-width-full", "appearance.contentMaxWidth", "full", "Use the full shell content width.")
        elif "focused width" in normalized or "narrow" in normalized:
            add_setting("set-width-focused", "appearance.contentMaxWidth", "focused", "Use a focused content width.")
        elif "wide" in normalized:
            add_setting("set-width-wide", "appearance.contentMaxWidth", "wide", "Use a wide content width.")

        if "hide telemetry" in normalized or "turn off telemetry" in normalized or "hide quick stats" in normalized:
            add_setting(
                "hide-desktop-telemetry",
                "layout.showDesktopTelemetry",
                False,
                "Hide desktop telemetry and quick stats.",
            )
        elif "show telemetry" in normalized or "show quick stats" in normalized:
            add_setting(
                "show-desktop-telemetry",
                "layout.showDesktopTelemetry",
                True,
                "Show desktop telemetry and quick stats.",
            )

        if "advanced" in normalized:
            add_setting("set-guided-mode-off", "layout.guidedMode", False, "Switch helper guidance to advanced mode.")
        elif "guided" in normalized or "beginner" in normalized:
            add_setting("set-guided-mode-on", "layout.guidedMode", True, "Switch helper guidance to guided mode.")

        for workspace_id, (_, aliases) in WORKSPACE_TARGETS.items():
            if any(alias in normalized for alias in aliases):
                operations.append(
                    AppControlOperation(
                        operation_id=f"open-workspace-{workspace_id}",
                        kind="navigation.open_workspace",
                        target="activeWorkspaceId",
                        value=workspace_id,
                        description=f"Open the {workspace_id} workspace.",
                    )
                )
                break

        return operations

    def _blocked_warnings(self, normalized: str) -> list[str]:
        matched_terms = [term for term in BLOCKED_TERMS if term in normalized]
        if not matched_terms:
            return []

        return [
            (
                "This instruction mentions terms outside the safe app-control boundary: "
                f"{', '.join(matched_terms)}. Use mission-control/code-review workflows instead."
            )
        ]

    def _script_id(self, instruction: str, operations: list[AppControlOperation]) -> str:
        digest_source = instruction + "|" + "|".join(operation.operation_id for operation in operations)
        return f"app-control-{sha1(digest_source.encode('utf-8')).hexdigest()[:12]}"

    def _summary(self, operations: list[AppControlOperation], actor_name: str | None = None) -> str:
        actor_prefix = f"{actor_name.strip()} proposes: " if actor_name and actor_name.strip() else ""
        if len(operations) == 1:
            return f"{actor_prefix}{operations[0].description}"
        return (
            f"{actor_prefix}Apply {len(operations)} safe app-control operations "
            "after taking a reversible settings backup."
        )

    def _report_item_for_operation(
        self,
        operation: AppControlOperation,
        request: AppControlExecutionReportRequest,
    ) -> AppControlExecutionReportItem:
        if operation.kind == "settings.patch":
            verified = self._read_setting_value(request.settings_after, operation.target) == operation.value
            return AppControlExecutionReportItem(
                id=operation.operation_id,
                label=operation.description,
                detail=(
                    "Verified by re-reading the local saved app settings after apply."
                    if verified
                    else "Requested for local settings apply, but the saved value did not read back as requested."
                ),
                delta=self._describe_setting_delta(
                    operation.target,
                    self._read_setting_value(request.settings_before, operation.target),
                    operation.value,
                ),
                verification="verified" if verified else "assumed",
            )

        if operation.kind == "navigation.open_workspace":
            verified = request.workspace_after == operation.value
            return AppControlExecutionReportItem(
                id=operation.operation_id,
                label=operation.description,
                detail=(
                    f"Verified by reading the current shell workspace focus as {operation.value}."
                    if verified
                    else "Navigation request was sent to the shell, but the current shell workspace focus does not match yet."
                ),
                delta=f"Workspace: {request.workspace_before or 'unknown'} -> {operation.value}",
                verification="verified" if verified else "assumed",
                verification_source={
                    "kind": "navigation",
                    "workspace_id": operation.value,
                },
            )

        return AppControlExecutionReportItem(
            id=operation.operation_id,
            label=operation.description,
            detail="Operation was issued from this panel, but no direct readback is available here.",
            verification="assumed",
        )

    def _report_item_for_revert_settings(
        self,
        request: AppControlExecutionReportRequest,
    ) -> AppControlExecutionReportItem:
        backup_settings = request.backup_settings or {}
        settings_restored = request.settings_after == backup_settings
        deltas = self._collect_restore_deltas(request.settings_before, backup_settings)
        return AppControlExecutionReportItem(
            id=f"{request.script_id}-settings-restore",
            label="Restore saved app settings profile",
            detail=(
                "Verified by re-reading the local saved settings profile after revert."
                if settings_restored
                else "Restore was requested, but the saved settings profile did not read back as the backup snapshot."
            ),
            delta=" | ".join(deltas) if deltas else "No admitted settings values changed during restore.",
            verification="verified" if settings_restored else "assumed",
        )

    def _report_item_for_revert_workspace(
        self,
        request: AppControlExecutionReportRequest,
    ) -> AppControlExecutionReportItem:
        target_workspace = request.backup_workspace_id or "home"
        verified = request.workspace_after == target_workspace
        return AppControlExecutionReportItem(
            id=f"{request.script_id}-workspace-restore",
            label=f"Return to {target_workspace} workspace",
            detail=(
                f"Verified by reading the current shell workspace focus as {target_workspace}."
                if verified
                else "Navigation request was sent to the shell, but the current shell workspace focus does not match yet."
            ),
            delta=f"Workspace: {request.workspace_before or 'unknown'} -> {target_workspace}",
            verification="verified" if verified else "assumed",
            verification_source={
                "kind": "navigation",
                "workspace_id": target_workspace,
            },
        )

    def _read_setting_value(self, settings: dict[str, Any], target: str) -> Any:
        current: Any = settings
        for key in target.split("."):
            if not isinstance(current, dict) or key not in current:
                return None
            current = current[key]
        return current

    def _format_value(self, value: Any) -> str:
        if value is True:
            return "true"
        if value is False:
            return "false"
        if value is None:
            return "unknown"
        return str(value)

    def _format_target_label(self, target: str) -> str:
        labels = {
            "appearance.themeMode": "Theme mode",
            "appearance.density": "Density",
            "appearance.contentMaxWidth": "Content width",
            "layout.showDesktopTelemetry": "Desktop telemetry",
            "layout.guidedMode": "Guided mode",
        }
        return labels.get(target, target)

    def _describe_setting_delta(self, target: str, before_value: Any, after_value: Any) -> str:
        return (
            f"{self._format_target_label(target)}: "
            f"{self._format_value(before_value)} -> {self._format_value(after_value)}"
        )

    def _collect_restore_deltas(
        self,
        settings_before: dict[str, Any],
        backup_settings: dict[str, Any],
    ) -> list[str]:
        deltas: list[str] = []
        for target in ADMITTED_SETTINGS_TARGETS:
            before_value = self._read_setting_value(settings_before, target)
            backup_value = self._read_setting_value(backup_settings, target)
            if before_value != backup_value:
                deltas.append(self._describe_setting_delta(target, before_value, backup_value))
        return deltas

    def _record_report_event(
        self,
        *,
        script_id: str,
        mode: AppControlReportMode,
        summary: str,
        items: list[AppControlExecutionReportItem],
        workspace_id: str | None,
    ):
        verified_count = len([item for item in items if item.verification == "verified"])
        assumed_count = len([item for item in items if item.verification == "assumed"])
        return events_service.record(
            category="app_control",
            severity=EventSeverity.INFO,
            message=f"App control {mode} report recorded for {script_id}.",
            workspace_id=workspace_id,
            event_type=f"app_control_{mode}",
            current_state="verified" if assumed_count == 0 else "mixed",
            details={
                "event_type": f"app_control_{mode}",
                "capability_status": "reviewable_local",
                "script_id": script_id,
                "mode": mode,
                "summary": summary,
                "item_count": str(len(items)),
                "verified_count": str(verified_count),
                "assumed_count": str(assumed_count),
                "receipt_items": [
                    {
                        "id": item.id,
                        "label": item.label,
                        "detail": item.detail,
                        "delta": item.delta,
                        "verification": item.verification,
                    }
                    for item in items
                ],
            },
        )


app_control_script_service = AppControlScriptService()
