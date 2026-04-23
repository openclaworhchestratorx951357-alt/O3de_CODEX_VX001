from hashlib import sha1
from typing import Any

from app.models.app_control import (
    AppControlBackupPlan,
    AppControlOperation,
    AppControlPreviewRequest,
    AppControlScriptPreview,
)


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


app_control_script_service = AppControlScriptService()
