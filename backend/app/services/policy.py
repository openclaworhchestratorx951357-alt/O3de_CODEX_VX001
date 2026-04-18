from app.models.control_plane import ToolPolicy
from app.services.catalog import catalog_service


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
                        args_schema=tool.args_schema,
                        result_schema=tool.result_schema,
                        required_locks=tool.default_locks,
                        risk=tool.risk,
                        requires_approval=tool.approval_class != "read_only",
                    )
                )
        return policies

    def get_policy(self, agent_id: str, tool_name: str) -> ToolPolicy | None:
        tool = catalog_service.get_tool_definition(agent_id, tool_name)
        if tool is None:
            return None
        return ToolPolicy(
            agent=agent_id,
            tool=tool_name,
            approval_class=tool.approval_class,
            args_schema=tool.args_schema,
            result_schema=tool.result_schema,
            required_locks=tool.default_locks,
            risk=tool.risk,
            requires_approval=tool.approval_class != "read_only",
        )


policy_service = PolicyService()
