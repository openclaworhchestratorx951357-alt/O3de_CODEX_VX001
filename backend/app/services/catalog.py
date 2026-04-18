from app.models.catalog import CatalogAgent, ToolDefinition, ToolsCatalog


def tool_args_schema(tool_name: str) -> str:
    return f"schemas/tools/{tool_name}.args.schema.json"


def tool_result_schema(tool_name: str) -> str:
    return f"schemas/tools/{tool_name}.result.schema.json"

CATALOG = ToolsCatalog(
    agents=[
        CatalogAgent(
            id="editor-control",
            name="Editor Control Agent",
            role="Owns the live O3DE Editor session and editor-safe authoring flows.",
            summary="Editor and level operations that require editor_session locking.",
            tools=[
                ToolDefinition(
                    name="editor.session.open",
                    description="Open or attach to a writable Editor session.",
                    approval_class="project_write",
                    args_schema=tool_args_schema("editor.session.open"),
                    result_schema=tool_result_schema("editor.session.open"),
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "session"],
                ),
                ToolDefinition(
                    name="editor.level.open",
                    description="Open an existing level for inspection or editing.",
                    approval_class="content_write",
                    args_schema=tool_args_schema("editor.level.open"),
                    result_schema=tool_result_schema("editor.level.open"),
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "level"],
                ),
                ToolDefinition(
                    name="editor.entity.create",
                    description="Create an entity in the open level.",
                    approval_class="content_write",
                    args_schema=tool_args_schema("editor.entity.create"),
                    result_schema=tool_result_schema("editor.entity.create"),
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "entity"],
                ),
                ToolDefinition(
                    name="editor.component.add",
                    description="Attach one or more components to an entity.",
                    approval_class="content_write",
                    args_schema=tool_args_schema("editor.component.add"),
                    result_schema=tool_result_schema("editor.component.add"),
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "component"],
                ),
            ],
        ),
        CatalogAgent(
            id="asset-pipeline",
            name="Asset / Media Pipeline Agent",
            role="Owns source asset inspection, batch processing, and content-pipeline prechecks.",
            summary="Asset and content-pipeline workflows guarded by asset_pipeline locking.",
            tools=[
                ToolDefinition(
                    name="asset.processor.status",
                    description="Inspect Asset Processor runtime state.",
                    approval_class="read_only",
                    args_schema=tool_args_schema("asset.processor.status"),
                    result_schema=tool_result_schema("asset.processor.status"),
                    default_locks=["asset_pipeline"],
                    risk="low",
                    tags=["asset", "status"],
                ),
                ToolDefinition(
                    name="asset.source.inspect",
                    description="Inspect a source asset and related metadata.",
                    approval_class="read_only",
                    args_schema=tool_args_schema("asset.source.inspect"),
                    result_schema=tool_result_schema("asset.source.inspect"),
                    default_locks=["asset_pipeline"],
                    risk="low",
                    tags=["asset", "inspect"],
                ),
                ToolDefinition(
                    name="asset.batch.process",
                    description="Run batch asset processing in a controlled mode.",
                    approval_class="build_execute",
                    args_schema=tool_args_schema("asset.batch.process"),
                    result_schema=tool_result_schema("asset.batch.process"),
                    default_locks=["asset_pipeline"],
                    risk="high",
                    tags=["asset", "batch"],
                ),
                ToolDefinition(
                    name="asset.move.safe",
                    description="Plan or execute a guarded source asset move.",
                    approval_class="destructive_content_write",
                    args_schema=tool_args_schema("asset.move.safe"),
                    result_schema=tool_result_schema("asset.move.safe"),
                    default_locks=["asset_pipeline"],
                    risk="high",
                    tags=["asset", "move"],
                ),
            ],
        ),
        CatalogAgent(
            id="project-build",
            name="Project / Build Agent",
            role="Owns project config, Gem state, configure, and build workflows.",
            summary="Project/build operations guarded by project_config and build_tree locks.",
            tools=[
                ToolDefinition(
                    name="project.inspect",
                    description="Inspect project manifest and override state.",
                    approval_class="read_only",
                    args_schema=tool_args_schema("project.inspect"),
                    result_schema=tool_result_schema("project.inspect"),
                    default_locks=["project_config"],
                    risk="low",
                    tags=["project", "inspect"],
                ),
                ToolDefinition(
                    name="settings.patch",
                    description="Apply a controlled settings registry patch.",
                    approval_class="config_write",
                    args_schema=tool_args_schema("settings.patch"),
                    result_schema=tool_result_schema("settings.patch"),
                    default_locks=["project_config"],
                    risk="high",
                    tags=["settings", "config"],
                ),
                ToolDefinition(
                    name="gem.enable",
                    description="Enable a Gem for the current project.",
                    approval_class="config_write",
                    args_schema=tool_args_schema("gem.enable"),
                    result_schema=tool_result_schema("gem.enable"),
                    default_locks=["project_config"],
                    risk="medium",
                    tags=["gem", "config"],
                ),
                ToolDefinition(
                    name="build.configure",
                    description="Configure or refresh the build tree.",
                    approval_class="build_execute",
                    args_schema=tool_args_schema("build.configure"),
                    result_schema=tool_result_schema("build.configure"),
                    default_locks=["build_tree"],
                    risk="high",
                    tags=["build", "configure"],
                ),
                ToolDefinition(
                    name="build.compile",
                    description="Compile one or more targets in the build tree.",
                    approval_class="build_execute",
                    args_schema=tool_args_schema("build.compile"),
                    result_schema=tool_result_schema("build.compile"),
                    default_locks=["build_tree"],
                    risk="high",
                    tags=["build", "compile"],
                ),
            ],
        ),
        CatalogAgent(
            id="render-lookdev",
            name="Render / Lookdev Agent",
            role="Owns material, shader, pipeline, and capture workflows.",
            summary="Render workflows guarded by render_pipeline locking.",
            tools=[
                ToolDefinition(
                    name="render.material.inspect",
                    description="Inspect a material and its related shader state.",
                    approval_class="read_only",
                    args_schema=tool_args_schema("render.material.inspect"),
                    result_schema=tool_result_schema("render.material.inspect"),
                    default_locks=["render_pipeline"],
                    risk="low",
                    tags=["render", "inspect"],
                ),
                ToolDefinition(
                    name="render.material.patch",
                    description="Apply a controlled material property patch.",
                    approval_class="content_write",
                    args_schema=tool_args_schema("render.material.patch"),
                    result_schema=tool_result_schema("render.material.patch"),
                    default_locks=["render_pipeline"],
                    risk="medium",
                    tags=["render", "material"],
                ),
                ToolDefinition(
                    name="render.shader.rebuild",
                    description="Rebuild shader-related assets after a change.",
                    approval_class="build_execute",
                    args_schema=tool_args_schema("render.shader.rebuild"),
                    result_schema=tool_result_schema("render.shader.rebuild"),
                    default_locks=["render_pipeline"],
                    risk="high",
                    tags=["render", "shader"],
                ),
                ToolDefinition(
                    name="render.capture.viewport",
                    description="Capture a viewport image for review or validation.",
                    approval_class="read_only",
                    args_schema=tool_args_schema("render.capture.viewport"),
                    result_schema=tool_result_schema("render.capture.viewport"),
                    default_locks=["render_pipeline"],
                    risk="low",
                    tags=["render", "capture"],
                ),
            ],
        ),
        CatalogAgent(
            id="validation",
            name="Validation Agent",
            role="Owns test execution, sequence planning, and evidence packaging.",
            summary="Validation workflows guarded by test_runtime locking.",
            tools=[
                ToolDefinition(
                    name="test.run.gtest",
                    description="Run native tests under the validation domain.",
                    approval_class="test_execute",
                    args_schema=tool_args_schema("test.run.gtest"),
                    result_schema=tool_result_schema("test.run.gtest"),
                    default_locks=["test_runtime"],
                    risk="medium",
                    tags=["test", "gtest"],
                ),
                ToolDefinition(
                    name="test.run.editor_python",
                    description="Run editor-hosted Python tests.",
                    approval_class="test_execute",
                    args_schema=tool_args_schema("test.run.editor_python"),
                    result_schema=tool_result_schema("test.run.editor_python"),
                    default_locks=["test_runtime"],
                    risk="medium",
                    tags=["test", "editor-python"],
                ),
                ToolDefinition(
                    name="test.tiaf.sequence",
                    description="Run a TIAF sequence in a controlled mode.",
                    approval_class="test_execute",
                    args_schema=tool_args_schema("test.tiaf.sequence"),
                    result_schema=tool_result_schema("test.tiaf.sequence"),
                    default_locks=["test_runtime"],
                    risk="high",
                    tags=["test", "tiaf"],
                ),
                ToolDefinition(
                    name="test.visual.diff",
                    description="Compare candidate images against a baseline.",
                    approval_class="read_only",
                    args_schema=tool_args_schema("test.visual.diff"),
                    result_schema=tool_result_schema("test.visual.diff"),
                    default_locks=["test_runtime"],
                    risk="low",
                    tags=["test", "visual"],
                ),
            ],
        ),
    ]
)


class CatalogService:
    def get_catalog_model(self) -> ToolsCatalog:
        return CATALOG

    def get_catalog(self) -> dict:
        return CATALOG.model_dump()

    def is_allowed_agent(self, agent_id: str) -> bool:
        return any(agent.id == agent_id for agent in CATALOG.agents)

    def is_allowed_tool_for_agent(self, agent_id: str, tool_name: str) -> bool:
        return self.get_tool_definition(agent_id, tool_name) is not None

    def get_tool_definition(
        self,
        agent_id: str,
        tool_name: str,
    ) -> ToolDefinition | None:
        for agent in CATALOG.agents:
            if agent.id == agent_id:
                for tool in agent.tools:
                    if tool.name == tool_name:
                        return tool
                return None
        return None


catalog_service = CatalogService()
