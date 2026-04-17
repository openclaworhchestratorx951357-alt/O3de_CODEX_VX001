# O3DE Agent Tool Contract v1

## Status
Proposed control-plane contract. This is **not** an official O3DE API. It is an agent-facing contract that maps documented O3DE surfaces into stable, approval-aware tools for automation and engine customization.

## Design goals
1. Give agents broad operational coverage across O3DE without giving every agent unrestricted write access everywhere.
2. Keep live Editor automation isolated from config/build/source control.
3. Make destructive and engine-level changes explicit, reviewable, and auditable.
4. Prefer Gems, Tool Gems, Asset Builders, materials, and RPI pipeline assets before core-engine patches.

---

## 1) Shared contract used by every tool

### 1.1 Request envelope
```json
{
  "request_id": "uuid",
  "tool": "editor.entity.create",
  "agent": "editor-control",
  "project_root": "/abs/path/to/project",
  "engine_root": "/abs/path/to/engine",
  "session_id": "optional-sticky-session-id",
  "dry_run": false,
  "approval_token": "optional",
  "locks": ["editor_session"],
  "timeout_s": 60,
  "args": {}
}
```

### 1.2 Response envelope
```json
{
  "request_id": "uuid",
  "ok": true,
  "result": {},
  "warnings": [],
  "artifacts": [],
  "state": {
    "dirty": false,
    "requires_save": false,
    "requires_reconfigure": false,
    "requires_rebuild": false,
    "requires_asset_reprocess": false
  },
  "timing_ms": 0,
  "logs": []
}
```

### 1.3 Error envelope
```json
{
  "request_id": "uuid",
  "ok": false,
  "error": {
    "code": "PRECONDITION_FAILED",
    "message": "A level must be open before calling this tool.",
    "retryable": false,
    "details": {}
  }
}
```

### 1.4 Common error codes
- `INVALID_ARGUMENT`
- `PRECONDITION_FAILED`
- `NOT_FOUND`
- `CONFLICT`
- `PERMISSION_DENIED`
- `APPROVAL_REQUIRED`
- `STATE_LOCKED`
- `UNSUPPORTED`
- `TIMEOUT`
- `O3DE_FAILURE`
- `BUILD_FAILURE`
- `ASSET_FAILURE`
- `TEST_FAILURE`

### 1.5 Common behavior rules
- Every mutating tool must support `dry_run=true` unless the operation is inherently runtime-only.
- Every mutating tool must declare whether it is idempotent.
- Every mutating tool must return the exact files, settings paths, entities, or assets it changed.
- Every tool must declare the lock it needs before execution.
- Every destructive tool must require an `approval_token`.
- Tools that touch engine source must require `engine_patch` approval.
- Tools that touch `project.json`, `.setreg`, `.setregpatch`, `enabled_gems.cmake`, or build output must return `requires_reconfigure` or `requires_rebuild` when applicable.

---

## 2) Shared types

### 2.1 Core identifiers
```json
{
  "ProjectRef": {
    "project_root": "string",
    "engine_root": "string",
    "project_name": "string"
  },
  "LevelRef": {
    "level_name": "string",
    "level_path": "string"
  },
  "EntityRef": {
    "entity_id": "u64|string",
    "name": "string"
  },
  "ComponentRef": {
    "component_id": "u64|string",
    "type_id": "uuid|string",
    "type_name": "string"
  },
  "SourceAssetRef": {
    "source_path": "string",
    "scan_folder": "string|null",
    "source_uuid": "uuid|null"
  },
  "ProductAssetRef": {
    "asset_id": "string",
    "sub_id": "u32|string",
    "product_path": "string"
  },
  "GemRef": {
    "gem_name": "string",
    "gem_path": "string"
  },
  "BuildRef": {
    "build_dir": "string",
    "generator": "string",
    "config": "profile|debug|release",
    "target": "string"
  }
}
```

### 2.2 Approval classes
- `read_only`
- `project_write`
- `content_write`
- `destructive_content_write`
- `config_write`
- `build_execute`
- `engine_patch`
- `test_execute`

### 2.3 Locks
- `editor_session`
- `project_config`
- `asset_pipeline`
- `render_pipeline`
- `build_tree`
- `engine_source`
- `test_runtime`

---

## 3) Agent ownership model

### 3.1 Editor Control Agent
Owns the live Editor session and all entity/component/level operations.

Allowed write surface:
- open/create/save levels
- create/find/update entities
- add/remove/inspect components
- get/set component properties
- optional prefab authoring operations that are implemented through Editor-safe APIs

Forbidden surface:
- direct edits to `project.json`, `.setreg`, engine source, build files
- direct writes into build output directories
- long-running batch asset processing outside its coordination contract

Required lock: `editor_session`

### 3.2 Asset / Media Pipeline Agent
Owns source asset inspection, builders, asset processing, asset cache operations, and safe relocation workflows.

Required lock: `asset_pipeline`

### 3.3 Render / Lookdev Agent
Owns Atom-facing material, shader, pass, and render-pipeline changes above the RHI layer.

Required lock: `render_pipeline`

### 3.4 Project / Build Agent
Owns `project.json`, user overrides, settings registry patches, Gem registration, configure/build/export.

Required locks: `project_config`, `build_tree`

### 3.5 Engine Code Agent
Owns engine/framework/Gem source edits, CMake changes, code indexing, and patch application.

Required lock: `engine_source`

### 3.6 Validation Agent
Owns test discovery, test execution, TIAF runs, crash triage, evidence packaging, and visual validation.

Required lock: `test_runtime`

---

## 4) Exact tool contracts by domain

# 4A. Editor Control Agent

## editor.session.open
Purpose: Start or attach to a single writable Editor session for a project.

Approval: `project_write`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "project_root": "string",
  "build_dir": "string|null",
  "wait_for_idle": true,
  "headless": false
}
```

Returns:
```json
{
  "session_id": "string",
  "editor_pid": 0,
  "project_root": "string",
  "has_open_level": false,
  "is_idle": true
}
```

Preconditions:
- Project is configured and an Editor binary exists.

Side effects:
- Launches the Editor if needed.

---

## editor.level.open
Purpose: Open an existing level. This is required before most Editor entity/component tools.

Approval: `content_write`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "level_name": "string",
  "prompt": false,
  "save_if_dirty": false
}
```

Returns:
```json
{
  "level": {
    "level_name": "string",
    "level_path": "string"
  },
  "was_already_open": false,
  "requires_save": false
}
```

Errors:
- `NOT_FOUND` if the level does not exist.
- `CONFLICT` if the current level is dirty and `save_if_dirty=false`.

---

## editor.level.create
Purpose: Create a new level.

Approval: `content_write`
Idempotent: no
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "level_name": "string",
  "resolution": 1024,
  "unit_size": 1,
  "use_terrain": false,
  "open_after_create": true
}
```

Returns:
```json
{
  "level": {
    "level_name": "string",
    "level_path": "string"
  },
  "files_created": ["string"]
}
```

---

## editor.level.save
Purpose: Save the currently open level.

Approval: `content_write`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string"
}
```

Returns:
```json
{
  "saved": true,
  "files_written": ["string"]
}
```

---

## editor.entity.create
Purpose: Create a new entity under an optional parent.

Approval: `content_write`
Idempotent: no
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "name": "string",
  "parent_entity_id": "string|null",
  "position": [0.0, 0.0, 0.0]
}
```

Returns:
```json
{
  "entity": {
    "entity_id": "string",
    "name": "string"
  },
  "requires_save": true
}
```

---

## editor.entity.find
Purpose: Search entities by name pattern or exact id.

Approval: `read_only`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "name_patterns": ["string"],
  "entity_ids": ["string"],
  "limit": 100
}
```

Returns:
```json
{
  "entities": [
    {
      "entity_id": "string",
      "name": "string",
      "parent_entity_id": "string|null"
    }
  ]
}
```

---

## editor.entity.rename
Purpose: Set an entity name.

Approval: `content_write`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "entity_id": "string",
  "new_name": "string"
}
```

Returns:
```json
{
  "entity_id": "string",
  "old_name": "string",
  "new_name": "string",
  "requires_save": true
}
```

---

## editor.entity.delete
Purpose: Delete one or more entities.

Approval: `destructive_content_write`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "entity_ids": ["string"],
  "approval_token": "string"
}
```

Returns:
```json
{
  "deleted_entity_ids": ["string"],
  "requires_save": true
}
```

---

## editor.component.add
Purpose: Add one or more components to an entity.

Approval: `content_write`
Idempotent: yes if `dedupe=true`, otherwise no
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "entity_id": "string",
  "components": [
    {
      "type_name": "string|null",
      "type_id": "string|null"
    }
  ],
  "dedupe": true
}
```

Returns:
```json
{
  "added": [
    {
      "component_id": "string",
      "type_name": "string",
      "type_id": "string"
    }
  ],
  "skipped": ["string"],
  "requires_save": true
}
```

Preconditions:
- Provider Gem for each component must already be enabled.

---

## editor.component.list
Purpose: Enumerate components attached to an entity.

Approval: `read_only`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "entity_id": "string"
}
```

Returns:
```json
{
  "components": [
    {
      "component_id": "string",
      "type_name": "string",
      "type_id": "string",
      "enabled": true
    }
  ]
}
```

---

## editor.component.remove
Purpose: Remove one or more components.

Approval: `destructive_content_write`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "component_ids": ["string"],
  "approval_token": "string"
}
```

Returns:
```json
{
  "removed_component_ids": ["string"],
  "requires_save": true
}
```

---

## editor.component.property.get
Purpose: Read a component property using its property path.

Approval: `read_only`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "component_id": "string",
  "property_path": "string"
}
```

Returns:
```json
{
  "component_id": "string",
  "property_path": "string",
  "value": "any",
  "value_type": "string"
}
```

---

## editor.component.property.set
Purpose: Set a component property using its property path.

Approval: `content_write`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "component_id": "string",
  "property_path": "string",
  "value": "any"
}
```

Returns:
```json
{
  "component_id": "string",
  "property_path": "string",
  "old_value": "any",
  "new_value": "any",
  "requires_save": true
}
```

---

## editor.component.property.schema
Purpose: Build the property tree and enumerate legal property paths for a component.

Approval: `read_only`
Idempotent: yes
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "component_id": "string",
  "include_types": true
}
```

Returns:
```json
{
  "component_id": "string",
  "properties": [
    {
      "path": "string",
      "type": "string",
      "is_container": false,
      "editable": true
    }
  ]
}
```

---

## editor.prefab.instantiate
Purpose: Instantiate a prefab into the open level.

Approval: `content_write`
Idempotent: no
Lock: `editor_session`

Args:
```json
{
  "session_id": "string",
  "prefab_asset": {
    "source_path": "string|null",
    "asset_id": "string|null"
  },
  "parent_entity_id": "string|null",
  "position": [0.0, 0.0, 0.0]
}
```

Returns:
```json
{
  "root_entity_ids": ["string"],
  "requires_save": true
}
```

Note: underlying implementation path must be validated against the concrete prefab authoring API available in the chosen engine revision.

---

# 4B. Asset / Media Pipeline Agent

## asset.processor.status
Purpose: Read current Asset Processor state.

Approval: `read_only`
Idempotent: yes
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string"
}
```

Returns:
```json
{
  "running": true,
  "idle": true,
  "queue_depth": 0,
  "cache_root": "string",
  "warnings": ["string"]
}
```

---

## asset.processor.wait
Purpose: Wait until Asset Processor is idle or timeout is reached.

Approval: `read_only`
Idempotent: yes
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string",
  "timeout_s": 600
}
```

Returns:
```json
{
  "idle": true,
  "queue_depth": 0,
  "timed_out": false
}
```

---

## asset.source.inspect
Purpose: Resolve a source asset and its known metadata.

Approval: `read_only`
Idempotent: yes
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string",
  "source_path": "string"
}
```

Returns:
```json
{
  "source": {
    "source_path": "string",
    "exists": true,
    "source_uuid": "string|null",
    "scan_folder": "string|null",
    "meta_path": "string|null"
  },
  "products": [
    {
      "asset_id": "string",
      "sub_id": "string",
      "product_path": "string"
    }
  ],
  "dependencies": {
    "source": ["string"],
    "product": ["string"]
  }
}
```

---

## asset.product.resolve
Purpose: Resolve product assets from a source asset or AssetId.

Approval: `read_only`
Idempotent: yes
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string",
  "source_path": "string|null",
  "asset_id": "string|null"
}
```

Returns:
```json
{
  "products": [
    {
      "asset_id": "string",
      "sub_id": "string",
      "product_path": "string",
      "builder_uuid": "string|null"
    }
  ]
}
```

---

## asset.batch.process
Purpose: Run Asset Processor Batch for deterministic processing in CI or preflight.

Approval: `build_execute`
Idempotent: yes
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string",
  "platforms": ["pc"],
  "reprocess": false,
  "timeout_s": 3600
}
```

Returns:
```json
{
  "success": true,
  "processed_jobs": 0,
  "failed_jobs": 0,
  "log_paths": ["string"],
  "requires_asset_reprocess": false
}
```

---

## asset.builder.create_python
Purpose: Scaffold a Python Asset Builder Gem or builder module.

Approval: `project_write`
Idempotent: no
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string",
  "gem_name": "string",
  "file_patterns": ["*.ext"],
  "builder_name": "string",
  "output_products": ["string"]
}
```

Returns:
```json
{
  "gem": {
    "gem_name": "string",
    "gem_path": "string"
  },
  "files_created": ["string"],
  "requires_reconfigure": true,
  "requires_rebuild": true
}
```

---

## asset.builder.update_descriptor
Purpose: Change builder UUID, version, file patterns, or product declarations.

Approval: `project_write`
Idempotent: yes
Lock: `asset_pipeline`

Args:
```json
{
  "builder_path": "string",
  "uuid": "string|null",
  "version": 1,
  "file_patterns": ["string"]
}
```

Returns:
```json
{
  "files_modified": ["string"],
  "requires_asset_reprocess": true,
  "warnings": [
    "Changing a builder UUID will trigger reprocessing for prior outputs."
  ]
}
```

---

## asset.scene.supported_formats.get
Purpose: Read supported scene import extensions from settings.

Approval: `read_only`
Idempotent: yes
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string"
}
```

Returns:
```json
{
  "extensions": ["fbx", "gltf", "glb"]
}
```

---

## asset.move.safe
Purpose: Move or rename a source asset while preserving references as safely as the current engine revision allows.

Approval: `destructive_content_write`
Idempotent: no
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string",
  "source_path": "string",
  "destination_path": "string",
  "rewrite_supported_references": true,
  "approval_token": "string"
}
```

Returns:
```json
{
  "moved": true,
  "old_path": "string",
  "new_path": "string",
  "files_modified": ["string"],
  "risk_report": {
    "known_path_based_references": ["string"],
    "manual_review_required": ["string"]
  },
  "requires_asset_reprocess": true
}
```

---

## asset.procedural_prefab.generate
Purpose: Generate prefab assets from imported scene data using procedural prefab workflows.

Approval: `content_write`
Idempotent: yes if same inputs and overwrite=true, otherwise no
Lock: `asset_pipeline`

Args:
```json
{
  "project_root": "string",
  "scene_source_path": "string",
  "script_path": "string",
  "output_dir": "string",
  "overwrite": false
}
```

Returns:
```json
{
  "prefab_paths": ["string"],
  "product_assets": ["string"],
  "requires_asset_reprocess": true
}
```

---

# 4C. Render / Lookdev Agent

## render.pipeline.inspect
Purpose: Read the current render pipeline assets, passes, and backend selection relevant to a project.

Approval: `read_only`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string",
  "pipeline_name": "string|null"
}
```

Returns:
```json
{
  "pipelines": [
    {
      "name": "string",
      "path": "string",
      "passes": ["string"],
      "views": ["string"],
      "backend_targets": ["dx12", "vulkan", "metal"]
    }
  ]
}
```

---

## render.pipeline.patch
Purpose: Apply a structured patch to an RPI pipeline JSON or related configuration asset.

Approval: `content_write`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string",
  "pipeline_path": "string",
  "patch": [
    {
      "op": "replace|add|remove",
      "path": "/json/pointer",
      "value": "any"
    }
  ]
}
```

Returns:
```json
{
  "files_modified": ["string"],
  "requires_asset_reprocess": true,
  "warnings": ["string"]
}
```

---

## render.pass.toggle
Purpose: Enable or disable a known pass in a render pipeline.

Approval: `content_write`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string",
  "pipeline_path": "string",
  "pass_name": "string",
  "enabled": true
}
```

Returns:
```json
{
  "pipeline_path": "string",
  "pass_name": "string",
  "enabled": true,
  "files_modified": ["string"],
  "requires_asset_reprocess": true
}
```

---

## render.material.inspect
Purpose: Inspect a material or material type asset, including referenced shaders and SRGs when discoverable.

Approval: `read_only`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string",
  "material_path": "string"
}
```

Returns:
```json
{
  "material_path": "string",
  "material_type": "string|null",
  "shader_references": ["string"],
  "properties": [
    {
      "name": "string",
      "type": "string",
      "value": "any"
    }
  ]
}
```

---

## render.material.patch
Purpose: Change material property values in a material asset.

Approval: `content_write`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string",
  "material_path": "string",
  "properties": [
    {
      "name": "string",
      "value": "any"
    }
  ]
}
```

Returns:
```json
{
  "material_path": "string",
  "old_values": {},
  "new_values": {},
  "files_modified": ["string"],
  "requires_asset_reprocess": true
}
```

---

## render.shader.inspect
Purpose: Inspect an AZSL shader or shader asset and report its linked material/pipeline usage.

Approval: `read_only`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string",
  "shader_path": "string"
}
```

Returns:
```json
{
  "shader_path": "string",
  "material_types": ["string"],
  "pipelines": ["string"],
  "backends": ["dx12", "vulkan", "metal"],
  "warnings": ["string"]
}
```

---

## render.shader.rebuild
Purpose: Rebuild shader- and material-related assets after a shader, SRG, or pipeline change.

Approval: `build_execute`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string",
  "paths": ["string"],
  "platforms": ["pc"]
}
```

Returns:
```json
{
  "success": true,
  "products_updated": ["string"],
  "failed_paths": ["string"],
  "log_paths": ["string"]
}
```

---

## render.capture.viewport
Purpose: Capture one or more rendered frames for lookdev review or downstream visual tests.

Approval: `read_only`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "session_id": "string|null",
  "camera": {
    "entity_id": "string|null",
    "transform": "object|null"
  },
  "resolution": [1920, 1080],
  "output_path": "string"
}
```

Returns:
```json
{
  "images": ["string"],
  "capture_metadata": {
    "resolution": [1920, 1080],
    "pipeline": "string|null"
  }
}
```

---

## render.backend.report
Purpose: Report RHI backend availability and current backend target.

Approval: `read_only`
Idempotent: yes
Lock: `render_pipeline`

Args:
```json
{
  "project_root": "string"
}
```

Returns:
```json
{
  "available": ["dx12", "vulkan", "metal"],
  "active": "string|null"
}
```

---

# 4D. Project / Build Agent

## project.inspect
Purpose: Read project manifest and local override state.

Approval: `read_only`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string"
}
```

Returns:
```json
{
  "project_json_path": "string",
  "user_project_json_path": "string|null",
  "properties": {
    "project_name": "string",
    "display_name": "string",
    "engine": "string|null",
    "engine_path": "string|null",
    "gem_names": ["string"],
    "external_subdirectories": ["string"]
  }
}
```

---

## project.edit_properties
Purpose: Safely edit supported `project.json` fields.

Approval: `config_write`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string",
  "changes": {
    "display_name": "string|null",
    "engine": "string|null",
    "engine_path": "string|null"
  }
}
```

Returns:
```json
{
  "files_modified": ["string"],
  "old_values": {},
  "new_values": {},
  "requires_reconfigure": true
}
```

---

## project.user_override.set
Purpose: Write `user/project.json` local overrides without changing shared project state.

Approval: `config_write`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string",
  "engine_path": "string|null",
  "engine": "string|null"
}
```

Returns:
```json
{
  "user_project_json_path": "string",
  "files_modified": ["string"],
  "requires_reconfigure": true
}
```

---

## settings.get
Purpose: Read a Settings Registry path.

Approval: `read_only`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string",
  "path": "/json/pointer",
  "merged": true
}
```

Returns:
```json
{
  "path": "/json/pointer",
  "value": "any",
  "source_files": ["string"]
}
```

---

## settings.patch
Purpose: Apply a `.setreg` merge patch or `.setregpatch` operation file through a controlled mutator.

Approval: `config_write`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string",
  "target_file": "string",
  "format": "merge|patch",
  "patch": "object|array"
}
```

Returns:
```json
{
  "target_file": "string",
  "files_modified": ["string"],
  "requires_reconfigure": true,
  "warnings": ["string"]
}
```

---

## gem.register
Purpose: Register an external Gem path into the project.

Approval: `config_write`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string",
  "gem_path": "string"
}
```

Returns:
```json
{
  "files_modified": ["string"],
  "registered": true,
  "requires_reconfigure": true
}
```

---

## gem.enable
Purpose: Enable a Gem for the project.

Approval: `config_write`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string",
  "gem_name": "string"
}
```

Returns:
```json
{
  "gem_name": "string",
  "enabled": true,
  "files_modified": ["string"],
  "requires_reconfigure": true,
  "requires_rebuild": true
}
```

---

## gem.disable
Purpose: Disable a Gem for the project.

Approval: `config_write`
Idempotent: yes
Lock: `project_config`

Args:
```json
{
  "project_root": "string",
  "gem_name": "string",
  "approval_token": "string"
}
```

Returns:
```json
{
  "gem_name": "string",
  "enabled": false,
  "files_modified": ["string"],
  "requires_reconfigure": true,
  "requires_rebuild": true
}
```

---

## build.configure
Purpose: Generate or refresh the CMake build tree.

Approval: `build_execute`
Idempotent: yes
Lock: `build_tree`

Args:
```json
{
  "project_root": "string",
  "build_dir": "string",
  "generator": "string",
  "config": "profile|debug|release",
  "cmake_args": ["string"]
}
```

Returns:
```json
{
  "build_dir": "string",
  "generator": "string",
  "success": true,
  "cache_path": "string",
  "log_paths": ["string"]
}
```

---

## build.compile
Purpose: Build one or more targets.

Approval: `build_execute`
Idempotent: yes
Lock: `build_tree`

Args:
```json
{
  "build_dir": "string",
  "targets": ["Editor"],
  "config": "profile|debug|release",
  "parallel": true,
  "timeout_s": 7200
}
```

Returns:
```json
{
  "success": true,
  "built_targets": ["string"],
  "artifacts": ["string"],
  "log_paths": ["string"]
}
```

---

## build.export_project
Purpose: Package a project for distribution using the project export pipeline.

Approval: `build_execute`
Idempotent: yes
Lock: `build_tree`

Args:
```json
{
  "project_root": "string",
  "build_dir": "string",
  "platform": "string",
  "output_dir": "string",
  "seed_list": ["string"],
  "export_script": "string|null"
}
```

Returns:
```json
{
  "success": true,
  "output_dir": "string",
  "packages": ["string"],
  "log_paths": ["string"]
}
```

---

## toolchain.validate
Purpose: Validate build prerequisites before configure/build/export.

Approval: `read_only`
Idempotent: yes
Lock: `build_tree`

Args:
```json
{
  "project_root": "string",
  "generator": "string"
}
```

Returns:
```json
{
  "ok": true,
  "checks": [
    {
      "name": "cmake",
      "ok": true,
      "details": "string"
    }
  ]
}
```

---

# 4E. Engine Code Agent

## engine.source.index
Purpose: Build or refresh a machine-readable index of engine/project symbols, CMake targets, Gems, and public headers.

Approval: `read_only`
Idempotent: yes
Lock: `engine_source`

Args:
```json
{
  "engine_root": "string",
  "project_root": "string|null"
}
```

Returns:
```json
{
  "index_path": "string",
  "symbols_indexed": 0,
  "targets_indexed": 0,
  "gems_indexed": 0
}
```

---

## engine.source.read
Purpose: Read a code file or indexed symbol with surrounding context.

Approval: `read_only`
Idempotent: yes
Lock: `engine_source`

Args:
```json
{
  "path": "string|null",
  "symbol": "string|null",
  "context_lines": 40
}
```

Returns:
```json
{
  "path": "string",
  "symbol": "string|null",
  "content": "string",
  "related_targets": ["string"],
  "related_gems": ["string"]
}
```

---

## engine.gem.create
Purpose: Scaffold a new code Gem or Tool Gem.

Approval: `engine_patch`
Idempotent: no
Lock: `engine_source`

Args:
```json
{
  "engine_root": "string",
  "project_root": "string",
  "gem_name": "string",
  "template": "runtime|tool|asset_builder|hybrid",
  "add_to_project": true
}
```

Returns:
```json
{
  "gem": {
    "gem_name": "string",
    "gem_path": "string"
  },
  "files_created": ["string"],
  "requires_reconfigure": true,
  "requires_rebuild": true
}
```

---

## engine.source.patch
Purpose: Apply a reviewed patch to engine or Gem source.

Approval: `engine_patch`
Idempotent: yes if patch already applied, otherwise no
Lock: `engine_source`

Args:
```json
{
  "patch_format": "unified_diff|structured_edit",
  "patch": "string|object",
  "approval_token": "string",
  "expected_files": ["string"]
}
```

Returns:
```json
{
  "files_modified": ["string"],
  "hunks_applied": 0,
  "requires_reconfigure": false,
  "requires_rebuild": true
}
```

---

## engine.cmake.patch
Purpose: Modify engine- or Gem-level CMake files under policy control.

Approval: `engine_patch`
Idempotent: yes
Lock: `engine_source`

Args:
```json
{
  "path": "string",
  "operations": [
    {
      "kind": "add_target|link_library|add_source|set_option|remove_entry",
      "payload": {}
    }
  ],
  "approval_token": "string"
}
```

Returns:
```json
{
  "files_modified": ["string"],
  "requires_reconfigure": true,
  "requires_rebuild": true
}
```

---

## engine.binding.update
Purpose: Update code-generation or scripting-binding surfaces owned by engine/Gem source.

Approval: `engine_patch`
Idempotent: yes
Lock: `engine_source`

Args:
```json
{
  "scope": "scriptcanvas|python|autogen|reflection",
  "targets": ["string"],
  "approval_token": "string"
}
```

Returns:
```json
{
  "files_modified": ["string"],
  "generated_outputs": ["string"],
  "requires_rebuild": true,
  "warnings": ["string"]
}
```

---

## engine.change.analyze
Purpose: Predict the blast radius of an engine/Gem/source change before applying it.

Approval: `read_only`
Idempotent: yes
Lock: `engine_source`

Args:
```json
{
  "paths": ["string"],
  "symbols": ["string"]
}
```

Returns:
```json
{
  "affected_targets": ["string"],
  "affected_gems": ["string"],
  "requires_reconfigure": false,
  "likely_tests": ["string"],
  "risk_level": "low|medium|high"
}
```

---

# 4F. Validation Agent

## test.catalog.list
Purpose: Enumerate available test targets and test types.

Approval: `read_only`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "build_dir": "string",
  "include_labels": true
}
```

Returns:
```json
{
  "tests": [
    {
      "name": "string",
      "kind": "gtest|pytest|editor_python|benchmark",
      "labels": ["string"]
    }
  ]
}
```

---

## test.run.gtest
Purpose: Run native tests.

Approval: `test_execute`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "build_dir": "string",
  "targets": ["string"],
  "filter": "string|null",
  "timeout_s": 3600
}
```

Returns:
```json
{
  "success": true,
  "passed": 0,
  "failed": 0,
  "report_paths": ["string"],
  "log_paths": ["string"]
}
```

---

## test.run.pytest
Purpose: Run Python tests outside the Editor interpreter.

Approval: `test_execute`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "working_dir": "string",
  "paths": ["string"],
  "markers": ["string"],
  "timeout_s": 3600
}
```

Returns:
```json
{
  "success": true,
  "report_paths": ["string"],
  "log_paths": ["string"]
}
```

---

## test.run.editor_python
Purpose: Run tests inside the Editor interpreter using EditorPythonBindings-style coverage.

Approval: `test_execute`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "session_id": "string|null",
  "test_paths": ["string"],
  "timeout_s": 3600
}
```

Returns:
```json
{
  "success": true,
  "report_paths": ["string"],
  "crashed": false,
  "log_paths": ["string"]
}
```

---

## test.run.benchmark
Purpose: Run GoogleBenchmark targets.

Approval: `test_execute`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "build_dir": "string",
  "targets": ["string"],
  "benchmark_filter": "string|null"
}
```

Returns:
```json
{
  "success": true,
  "result_paths": ["string"],
  "log_paths": ["string"]
}
```

---

## test.tiaf.sequence
Purpose: Run a TIAF sequence.

Approval: `test_execute`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "build_dir": "string",
  "sequence": "seed|regular|tia|tianowrite|tiaorseed",
  "safemode": false,
  "policy": {
    "failure": "continue|abort",
    "integrity": "continue|abort",
    "execution": "continue|abort"
  },
  "timeout_s": 7200
}
```

Returns:
```json
{
  "success": true,
  "selected_tests": ["string"],
  "return_code": 0,
  "report_paths": ["string"],
  "historic_data_paths": ["string"]
}
```

---

## test.visual.capture
Purpose: Capture stable screenshots or frame sequences for visual regression.

Approval: `test_execute`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "session_id": "string|null",
  "scenario": "string",
  "camera": "object|null",
  "output_dir": "string"
}
```

Returns:
```json
{
  "images": ["string"],
  "metadata_path": "string"
}
```

---

## test.visual.diff
Purpose: Compare captured images against a baseline with explicit tolerances.

Approval: `read_only`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "baseline_dir": "string",
  "candidate_dir": "string",
  "tolerance": {
    "max_pixel_delta": 0.01,
    "max_failed_pixels": 100,
    "ignore_exposure_shift": false
  }
}
```

Returns:
```json
{
  "pass": true,
  "diff_images": ["string"],
  "summary": {
    "compared": 0,
    "failed": 0
  }
}
```

---

## test.crash_triage.bundle
Purpose: Collect logs, dumps, return codes, command lines, and recent tool actions into one evidence bundle.

Approval: `read_only`
Idempotent: yes
Lock: `test_runtime`

Args:
```json
{
  "since_minutes": 60,
  "output_dir": "string"
}
```

Returns:
```json
{
  "bundle_path": "string",
  "logs": ["string"],
  "dumps": ["string"],
  "commands": ["string"]
}
```

---

## 5) Cross-agent handoff rules

### Editor -> Asset
When an Editor operation introduces or modifies content that depends on Asset Processor output, the Editor agent must return `requires_asset_reprocess=true` and hand off to `asset.processor.wait` or `asset.batch.process` before asking for validation.

### Asset -> Render
When shader/material/pipeline products are affected, the Asset agent must hand off to `render.shader.rebuild` and include impacted assets.

### Project/Build -> Editor
Any `gem.enable`, `gem.disable`, `settings.patch`, `project.edit_properties`, `build.configure`, or `build.compile` call invalidates current Editor assumptions. The orchestrator must reopen or refresh the Editor session before new write operations.

### Engine -> Build -> Validation
Every engine source change must be followed by `build.configure` if CMake-affecting, then `build.compile`, then at least one validation tool.

---

## 6) Approval policy

No approval required:
- read-only inspection tools
- idempotent status/reporting tools

Explicit approval required:
- entity deletion
- component removal
- asset move/rename
- Gem disable
- any change to shared config
- any build/export execution in a protected environment
- any engine/framework/Gem source patch

Dual approval recommended:
- RHI/backend changes
- Settings Registry patches affecting rendering, asset scanning, or build behavior globally
- bulk asset migrations

---

## 7) Minimum viable implementation order
1. `project.inspect`, `settings.get`, `gem.enable`, `build.configure`, `build.compile`
2. `editor.session.open`, `editor.level.open`, `editor.entity.create`, `editor.component.add`, `editor.component.property.get/set`, `editor.level.save`
3. `asset.processor.status`, `asset.processor.wait`, `asset.source.inspect`, `asset.batch.process`
4. `render.material.inspect`, `render.material.patch`, `render.capture.viewport`
5. `test.run.editor_python`, `test.run.gtest`, `test.crash_triage.bundle`
6. engine-source patch and CMake patch tools only after the above are stable

---

## 8) What this contract deliberately leaves out
- no free-form “run arbitrary Python in Editor” tool for general agents
- no unrestricted “edit any file anywhere” tool
- no cross-agent shared write lock
- no direct RHI mutation tool in v1
- no silent config mutation without emitted patches and audit records
