from app.models.catalog import CatalogAgent, ToolDefinition, ToolsCatalog
from app.services.editor_runtime_defaults import EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S


def tool_args_schema(tool_name: str) -> str:
    return f"schemas/tools/{tool_name}.args.schema.json"


def tool_result_schema(tool_name: str) -> str:
    return f"schemas/tools/{tool_name}.result.schema.json"


def tool_capability_status(tool_name: str) -> str:
    if tool_name == "project.inspect":
        return "hybrid-read-only"
    if tool_name == "asset.source.inspect":
        return "hybrid-read-only"
    if tool_name == "editor.component.property.get":
        return "hybrid-read-only"
    if tool_name in {
        "editor.session.open",
        "editor.level.open",
        "editor.entity.create",
        "editor.component.add",
    }:
        return "real-authoring"
    if tool_name == "build.configure":
        return "plan-only"
    if tool_name in {"settings.patch", "gem.enable", "build.compile"}:
        return "mutation-gated"
    return "simulated-only"

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
                    adapter_family="editor-control",
                    capability_status=tool_capability_status("editor.session.open"),
                    args_schema=tool_args_schema("editor.session.open"),
                    result_schema=tool_result_schema("editor.session.open"),
                    default_locks=["editor_session"],
                    default_timeout_s=EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S,
                    risk="medium",
                    tags=["editor", "session"],
                ),
                ToolDefinition(
                    name="editor.level.open",
                    description="Open an existing level for inspection or editing.",
                    approval_class="content_write",
                    adapter_family="editor-control",
                    capability_status=tool_capability_status("editor.level.open"),
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
                    adapter_family="editor-control",
                    capability_status=tool_capability_status("editor.entity.create"),
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
                    adapter_family="editor-control",
                    capability_status=tool_capability_status("editor.component.add"),
                    args_schema=tool_args_schema("editor.component.add"),
                    result_schema=tool_result_schema("editor.component.add"),
                    default_locks=["editor_session"],
                    risk="medium",
                    tags=["editor", "component"],
                ),
                ToolDefinition(
                    name="editor.component.property.get",
                    description="Read a component property from an explicit component id.",
                    approval_class="read_only",
                    adapter_family="editor-control",
                    capability_status=tool_capability_status("editor.component.property.get"),
                    args_schema=tool_args_schema("editor.component.property.get"),
                    result_schema=tool_result_schema("editor.component.property.get"),
                    default_locks=["editor_session"],
                    risk="low",
                    tags=["editor", "component", "property", "read"],
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
                    adapter_family="asset-pipeline",
                    capability_status=tool_capability_status("asset.processor.status"),
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
                    adapter_family="asset-pipeline",
                    capability_status=tool_capability_status("asset.source.inspect"),
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
                    adapter_family="asset-pipeline",
                    capability_status=tool_capability_status("asset.batch.process"),
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
                    adapter_family="asset-pipeline",
                    capability_status=tool_capability_status("asset.move.safe"),
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
                    adapter_family="project-build",
                    capability_status=tool_capability_status("project.inspect"),
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
                    adapter_family="project-build",
                    capability_status=tool_capability_status("settings.patch"),
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
                    adapter_family="project-build",
                    capability_status=tool_capability_status("gem.enable"),
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
                    adapter_family="project-build",
                    capability_status=tool_capability_status("build.configure"),
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
                    adapter_family="project-build",
                    capability_status=tool_capability_status("build.compile"),
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
                    adapter_family="render-lookdev",
                    capability_status=tool_capability_status("render.material.inspect"),
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
                    adapter_family="render-lookdev",
                    capability_status=tool_capability_status("render.material.patch"),
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
                    adapter_family="render-lookdev",
                    capability_status=tool_capability_status("render.shader.rebuild"),
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
                    adapter_family="render-lookdev",
                    capability_status=tool_capability_status("render.capture.viewport"),
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
                    adapter_family="validation",
                    capability_status=tool_capability_status("test.run.gtest"),
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
                    adapter_family="validation",
                    capability_status=tool_capability_status("test.run.editor_python"),
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
                    adapter_family="validation",
                    capability_status=tool_capability_status("test.tiaf.sequence"),
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
                    adapter_family="validation",
                    capability_status=tool_capability_status("test.visual.diff"),
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
