from app.services.catalog import catalog_service


def test_catalog_contains_agents() -> None:
    catalog = catalog_service.get_catalog()
    assert "agents" in catalog
    assert len(catalog["agents"]) >= 1
    assert "tools" in catalog["agents"][0]


def test_known_agent_is_allowed() -> None:
    assert catalog_service.is_allowed_agent("project-build") is True


def test_unknown_agent_is_not_allowed() -> None:
    assert catalog_service.is_allowed_agent("not-a-real-agent") is False


def test_tool_belongs_to_expected_agent() -> None:
    assert catalog_service.is_allowed_tool_for_agent(
        "project-build", "project.inspect"
    ) is True


def test_tool_not_allowed_for_wrong_agent() -> None:
    assert catalog_service.is_allowed_tool_for_agent(
        "project-build", "render.capture.viewport"
    ) is False


def test_tool_definition_includes_policy_metadata() -> None:
    tool = catalog_service.get_tool_definition("project-build", "build.configure")
    assert tool is not None
    assert tool.approval_class == "build_execute"
    assert tool.args_schema.endswith("build.configure.args.schema.json")
    assert tool.result_schema.endswith("build.configure.result.schema.json")
    assert "build_tree" in tool.default_locks
