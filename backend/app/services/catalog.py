from app.models.catalog import CatalogAgent, ToolDefinition, ToolsCatalog

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
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "session"],
                ),
                ToolDefinition(
                    name="editor.level.open",
                    description="Open an existing level for inspection or editing.",
                    approval_class="content_write",
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "level"],
                ),
                ToolDefinition(
                    name="editor.entity.create",
                    description="Create an entity in the open level.",
                    approval_class="content_write",
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "entity"],
                ),
                ToolDefinition(
                    name="editor.component.add",
                    description="Attach one or more components to an entity.",
                    approval_class="content_write",
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
                    default_locks=["asset_pipeline"],
                    risk="low",
                    tags=["asset", "status"],
                ),
                ToolDefinition(
                    name="asset.source.inspect",
                    description="Inspect a source asset and related metadata.",
                    approval_class="read_only",
                    default_locks=["asset_pipeline"],
                    risk="low",
                    tags=["asset", "inspect"],
                ),
                ToolDefinition(
                    name="asset.batch.process",
                    description="Run batch asset processing in a controlled mode.",
                    approval_class="build_execute",
                    default_locks=["asset_pipeline"],
                    risk="high",
                    tags=["asset", "batch"],
                ),
                ToolDefinition(
                    name="asset.move.safe",
                    description="Plan or execute a guarded source asset move.",
                    approval_class="destructive_content_write",
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
                    default_locks=["project_config"],
                    risk="low",
                    tags=["project", "inspect"],
                ),
                ToolDefinition(
                    name="settings.patch",
                    description="Apply a controlled settings registry patch.",
                    approval_class="config_write",
                    default_locks=["project_config"],
                    risk="high",
                    tags=["settings", "config"],
                ),
                ToolDefinition(
                    name="gem.enable",
                    description="Enable a Gem for the current project.",
                    approval_class="config_write",
                    default_locks=["project_config"],
                    risk="medium",
                    tags=["gem", "config"],
                ),
                ToolDefinition(
                    name="build.configure",
                    description="Configure or refresh the build tree.",
                    approval_class="build_execute",
                    default_locks=["build_tree"],
                    risk="high",
                    tags=["build", "configure"],
                ),
                ToolDefinition(
                    name="build.compile",
                    description="Compile one or more targets in the build tree.",
                    approval_class="build_execute",
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
                    default_locks=["render_pipeline"],
                    risk="low",
                    tags=["render", "inspect"],
                ),
                ToolDefinition(
                    name="render.material.patch",
                    description="Apply a controlled material property patch.",
                    approval_class="content_write",
                    default_locks=["render_pipeline"],
                    risk="medium",
                    tags=["render", "material"],
                ),
                ToolDefinition(
                    name="render.shader.rebuild",
                    description="Rebuild shader-related assets after a change.",
                    approval_class="build_execute",
                    default_locks=["render_pipeline"],
                    risk="high",
                    tags=["render", "shader"],
                ),
                ToolDefinition(
                    name="render.capture.viewport",
                    description="Capture a viewport image for review or validation.",
                    approval_class="read_only",
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
                    default_locks=["test_runtime"],
                    risk="medium",
                    tags=["test", "gtest"],
                ),
                ToolDefinition(
                    name="test.run.editor_python",
                    description="Run editor-hosted Python tests.",
                    approval_class="test_execute",
                    default_locks=["test_runtime"],
                    risk="medium",
                    tags=["test", "editor-python"],
                ),
                ToolDefinition(
                    name="test.tiaf.sequence",
                    description="Run a TIAF sequence in a controlled mode.",
                    approval_class="test_execute",
                    default_locks=["test_runtime"],
                    risk="high",
                    tags=["test", "tiaf"],
                ),
                ToolDefinition(
                    name="test.visual.diff",
                    description="Compare candidate images against a baseline.",
                    approval_class="read_only",
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
