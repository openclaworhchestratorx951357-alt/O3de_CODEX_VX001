import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from app.models.api import AdapterModeStatus
from app.models.response_envelope import DispatchResult
from app.services.catalog import catalog_service

SUPPORTED_ADAPTER_MODES = {"simulated"}


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
                "adapter_family": self.family,
                "adapter_mode": self.mode,
            },
            result_summary="Simulated dispatch completed successfully.",
        )


class AdapterService:
    def _configured_mode(self) -> str:
        return os.getenv("O3DE_ADAPTER_MODE", "simulated").strip().lower() or "simulated"

    def _registry(self) -> dict[str, ToolExecutionAdapter]:
        configured_mode = self._configured_mode()
        if configured_mode not in SUPPORTED_ADAPTER_MODES:
            return {}
        return {
            agent.id: SimulatedToolExecutionAdapter(family=agent.id, mode=configured_mode)
            for agent in catalog_service.get_catalog_model().agents
        }

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
                available_families=available_families,
                warning=(
                    f"Configured adapter mode '{configured_mode}' is not supported; "
                    "only 'simulated' is currently available."
                ),
                notes=[
                    "Adapter mode selection is now config-driven.",
                    "Real O3DE adapters are not yet implemented.",
                    "Simulated execution remains the only supported adapter mode in this phase.",
                ],
            )
        return AdapterModeStatus(
            ready=True,
            configured_mode=configured_mode,
            active_mode="simulated",
            supports_real_execution=False,
            available_families=available_families,
            warning=None,
            notes=[
                "Adapter mode selection is now config-driven.",
                "Real O3DE adapters are not yet implemented.",
                "Simulated execution remains the only supported adapter mode in this phase.",
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
            approval_class=approval_class,
            locks_acquired=locks_acquired,
        )


adapter_service = AdapterService()
