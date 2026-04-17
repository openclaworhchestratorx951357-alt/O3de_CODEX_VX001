export const mockAgents = [
  {
    id: "editor-control",
    name: "Editor Control Agent",
    role: "Owns the live Editor session and structured entity/component operations.",
    locks: ["editor_session"],
    owned_tools: [
      "editor.session.open",
      "editor.level.open",
      "editor.entity.create",
      "editor.component.add",
      "editor.component.property.set",
    ],
  },
  {
    id: "asset-pipeline",
    name: "Asset / Media Pipeline Agent",
    role: "Owns asset inspection, processing, builder workflows, and safer relocation flows.",
    locks: ["asset_pipeline"],
    owned_tools: [
      "asset.processor.status",
      "asset.source.inspect",
      "asset.batch.process",
      "asset.move.safe",
    ],
  },
  {
    id: "project-build",
    name: "Project / Build Agent",
    role: "Owns project settings, Gem state, configure/build, and export workflows.",
    locks: ["project_config", "build_tree"],
    owned_tools: [
      "project.inspect",
      "settings.patch",
      "gem.enable",
      "build.configure",
      "build.compile",
    ],
  },
  {
    id: "render-lookdev",
    name: "Render / Lookdev Agent",
    role: "Owns materials, passes, pipelines, shaders, and viewport captures.",
    locks: ["render_pipeline"],
    owned_tools: [
      "render.material.inspect",
      "render.material.patch",
      "render.shader.rebuild",
      "render.capture.viewport",
    ],
  },
  {
    id: "validation",
    name: "Validation Agent",
    role: "Owns test execution, TIAF sequences, crash triage, and visual validation.",
    locks: ["test_runtime"],
    owned_tools: [
      "test.run.gtest",
      "test.run.editor_python",
      "test.tiaf.sequence",
      "test.visual.diff",
    ],
  },
] as const;
