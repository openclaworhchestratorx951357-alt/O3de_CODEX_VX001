from fastapi import APIRouter

router = APIRouter(prefix="/tools", tags=["tools-catalog"])


@router.get("/catalog")
def get_tools_catalog() -> dict:
    return {
        "agents": [
            "editor-control",
            "asset-pipeline",
            "project-build",
            "render-lookdev",
            "validation",
        ],
        "tools": {
            "editor-control": [
                "editor.session.open",
                "editor.level.open",
                "editor.entity.create",
                "editor.component.add",
            ],
            "asset-pipeline": [
                "asset.processor.status",
                "asset.source.inspect",
                "asset.batch.process",
                "asset.move.safe",
            ],
            "project-build": [
                "project.inspect",
                "settings.patch",
                "gem.enable",
                "build.configure",
                "build.compile",
            ],
            "render-lookdev": [
                "render.material.inspect",
                "render.material.patch",
                "render.shader.rebuild",
                "render.capture.viewport",
            ],
            "validation": [
                "test.run.gtest",
                "test.run.editor_python",
                "test.tiaf.sequence",
                "test.visual.diff",
            ],
        },
    }
