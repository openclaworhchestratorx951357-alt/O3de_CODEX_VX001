# Phase 8 Editor Comment Scalar Target Discovery

## Property Tree Discovery Fix Checkpoint - 2026-04-26

Proof command:
- `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-comment-scalar-target-proof`

Proof artifact:
- `backend/runtime/live_editor_comment_scalar_target_proof_20260426-085446.json`

Runtime restore boundary artifact:
- `backend/runtime/editor_state/restore_boundaries/3474cf9464f71663/dc6fdd30bb2342c48eb5af1ca7560088.prefab`

Canonical proof target:
- project: `C:\Users\topgu\O3DE\Projects\McpSandbox`
- engine: `C:\src\o3de`
- level: `Levels/TestLoevel01`
- backend listener after proof: PID `30092`
- canonical `Editor.exe` after proof: PID `15708`
- bridge heartbeat after proof: `heartbeat_fresh: true`

Executed proof-only chain:
- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add` with allowlisted `Comment`
- proof-only `editor.component.property.list`

Temporary proof target:
- entity: `CodexCommentScalarTargetProofEntity_20260426_085446`
- component: `Comment`
- component id:
  `EntityComponentIdPair(EntityId(16667653815670659382), 10682108348765234871)`
- component id provenance:
  `admitted_runtime_component_add_result`

Discovery result:
- status: `blocked`
- succeeded: `true`
- target selected: `false`
- future write candidate selected: `false`
- blocker code: `comment_source_guided_readback_failed`
- blocker:
  `BuildComponentPropertyList` and `BuildComponentPropertyTreeEditor` both
  returned only an empty Comment property path, and every source-guided named
  `GetComponentProperty` readback attempt failed with "path provided was not
  found in tree"

Discovery ladder evidence:
- `EditorComponentAPIBus.BuildComponentPropertyList` succeeded and returned
  one raw path: `""`
- `EditorComponentAPIBus.BuildComponentPropertyTreeEditor` succeeded
- `PropertyTreeEditor.build_paths_list()` returned one raw path: `""`
- `PropertyTreeEditor.build_paths_list_with_types()` returned one typed entry:
  ` (AZStd::string,Visible)`
- the empty path is recorded as live evidence for the Comment field, but is not
  treated as a stable operator target
- source-guided fallback was attempted with Comment-only paths derived from
  local O3DE source inspection, including `Comment`, `Configuration`, and
  `Configuration|Comment`; all readback attempts failed
- `SetComponentProperty` was not called

Source inspection evidence:
- source file:
  `C:\src\o3de\Gems\LmbrCentral\Code\Source\Editor\EditorCommentComponent.cpp`
- serialize field:
  `Field("Configuration", &EditorCommentComponent::m_comment)`
- edit-context data element:
  `DataElement(..., &EditorCommentComponent::m_comment, "", "Comment")`
- field type: `AZStd::string`

Mutation and restore truth:
- mutation occurred: temporary root entity creation plus allowlisted `Comment`
  component add
- restore result: `restored_and_verified`
- restore scope:
  filesystem restoration of selected loaded-level prefab from the pre-mutation
  backup
- no live Editor undo, viewport reload, or post-restore entity-absence readback
  was proven

What this proof verifies:
- `Comment` is reachable through the existing admitted component-add allowlist.
- The proof can attempt non-render component property discovery through
  `BuildComponentPropertyList`, `PropertyTreeEditor`, and Comment-only
  source-guided readback without admitting property writes.
- The current live Editor API exposes the `Comment` text field as an empty
  property path in both list and tree evidence, so the proof correctly refuses
  to select it as a stable scalar target.
- `/adapters` still does not expose `editor.component.property.list` or
  `editor.component.property.write`.
- Prompt Studio property writes remain unadmitted.

Explicitly not proven:
- no scalar/text-like property path was selected
- no property value was read
- no property write was implemented, admitted, or executed
- no public `editor.component.property.list` admission occurred
- no arbitrary Editor Python, arbitrary component/property browsing, delete,
  parenting, prefab, material, asset, render, build, or TIAF behavior was
  exercised

Recommended next packet:
- choose another already-allowlisted non-render component, such as `Camera`, or
  design a separate proof-only strategy for handling O3DE components whose live
  reflected property path is the empty string; do not widen into property writes
  or public property-list admission

## Previous Comment Discovery Blocker - 2026-04-26

The earlier artifact
`backend/runtime/live_editor_comment_scalar_target_proof_20260426-081548.json`
blocked at `comment_property_list_unavailable` before the property tree ladder
was added. That was not a failed safety slice: it proved temporary Comment
component provisioning and restore, but did not yet collect enough typed live
property evidence.
