from app.services.catalog import catalog_service
from app.services.editor_runtime_defaults import EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S


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
    assert tool.adapter_family == "project-build"
    assert tool.capability_status == "plan-only"
    assert tool.args_schema.endswith("build.configure.args.schema.json")
    assert tool.result_schema.endswith("build.configure.result.schema.json")
    assert "build_tree" in tool.default_locks


def test_project_inspect_is_classified_as_hybrid_read_only() -> None:
    tool = catalog_service.get_tool_definition("project-build", "project.inspect")
    assert tool is not None
    assert tool.capability_status == "hybrid-read-only"


def test_build_compile_is_cataloged_as_plan_only() -> None:
    tool = catalog_service.get_tool_definition("project-build", "build.compile")
    assert tool is not None
    assert tool.approval_class == "build_execute"
    assert tool.adapter_family == "project-build"
    assert tool.capability_status == "plan-only"
    assert tool.args_schema.endswith("build.compile.args.schema.json")
    assert tool.result_schema.endswith("build.compile.result.schema.json")
    assert "build_tree" in tool.default_locks


def test_gem_enable_is_cataloged_as_mutation_gated() -> None:
    tool = catalog_service.get_tool_definition("project-build", "gem.enable")
    assert tool is not None
    assert tool.approval_class == "config_write"
    assert tool.adapter_family == "project-build"
    assert tool.capability_status == "mutation-gated"
    assert tool.args_schema.endswith("gem.enable.args.schema.json")
    assert tool.result_schema.endswith("gem.enable.result.schema.json")
    assert "project_config" in tool.default_locks


def test_render_material_patch_is_cataloged_as_mutation_gated() -> None:
    tool = catalog_service.get_tool_definition("render-lookdev", "render.material.patch")
    assert tool is not None
    assert tool.approval_class == "content_write"
    assert tool.adapter_family == "render-lookdev"
    assert tool.capability_status == "mutation-gated"
    assert tool.args_schema.endswith("render.material.patch.args.schema.json")
    assert tool.result_schema.endswith("render.material.patch.result.schema.json")
    assert "render_pipeline" in tool.default_locks


def test_asset_batch_process_is_cataloged_as_plan_only() -> None:
    tool = catalog_service.get_tool_definition("asset-pipeline", "asset.batch.process")
    assert tool is not None
    assert tool.approval_class == "build_execute"
    assert tool.adapter_family == "asset-pipeline"
    assert tool.capability_status == "plan-only"
    assert tool.args_schema.endswith("asset.batch.process.args.schema.json")
    assert tool.result_schema.endswith("asset.batch.process.result.schema.json")
    assert "asset_pipeline" in tool.default_locks


def test_asset_move_safe_is_cataloged_as_plan_only() -> None:
    tool = catalog_service.get_tool_definition("asset-pipeline", "asset.move.safe")
    assert tool is not None
    assert tool.approval_class == "destructive_content_write"
    assert tool.adapter_family == "asset-pipeline"
    assert tool.capability_status == "plan-only"
    assert tool.args_schema.endswith("asset.move.safe.args.schema.json")
    assert tool.result_schema.endswith("asset.move.safe.result.schema.json")
    assert "asset_pipeline" in tool.default_locks


def test_editor_component_property_get_is_cataloged_as_hybrid_read_only() -> None:
    tool = catalog_service.get_tool_definition(
        "editor-control",
        "editor.component.property.get",
    )
    assert tool is not None
    assert tool.approval_class == "read_only"
    assert tool.adapter_family == "editor-control"
    assert tool.capability_status == "hybrid-read-only"
    assert tool.args_schema.endswith("editor.component.property.get.args.schema.json")
    assert tool.result_schema.endswith("editor.component.property.get.result.schema.json")
    assert "editor_session" in tool.default_locks


def test_editor_session_open_catalog_timeout_matches_runtime_default() -> None:
    tool = catalog_service.get_tool_definition("editor-control", "editor.session.open")
    assert tool is not None
    assert tool.default_timeout_s == EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S
