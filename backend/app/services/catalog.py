from app.models.catalog import CatalogAgent, ToolsCatalog

CATALOG = ToolsCatalog(
    agents=[
        CatalogAgent(
            id="editor-control",
            name="Editor Control Agent",
            tools=[
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.component.add",
            ],
        ),
        CatalogAgent(
            id="asset-pipeline",
            name="Asset / Media Pipeline Agent",
            tools=[
                "asset.processor.status",
                "asset.source.inspect",
                "asset.batch.process",
                "asset.move.safe",
            ],
        ),
        CatalogAgent(
            id="project-build",
            name="Project / Build Agent",
            tools=[
                "project.inspect",
                "settings.patch",
                "gem.enable",
                "build.configure",
                "build.compile",
            ],
        ),
        CatalogAgent(
            id="render-lookdev",
            name="Render / Lookdev Agent",
            tools=[
                "render.material.inspect",
                "render.material.patch",
                "render.shader.rebuild",
                "render.capture.viewport",
            ],
        ),
        CatalogAgent(
            id="validation",
            name="Validation Agent",
            tools=[
                "test.run.gtest",
                "test.run.editor_python",
                "test.tiaf.sequence",
                "test.visual.diff",
            ],
        ),
    ]
)


class CatalogService:
    def get_catalog(self) -> dict:
        return CATALOG.model_dump()

    def is_allowed_agent(self, agent_id: str) -> bool:
        return any(agent.id == agent_id for agent in CATALOG.agents)

    def is_allowed_tool_for_agent(self, agent_id: str, tool_name: str) -> bool:
        for agent in CATALOG.agents:
            if agent.id == agent_id:
                return tool_name in agent.tools
        return False


catalog_service = CatalogService()
