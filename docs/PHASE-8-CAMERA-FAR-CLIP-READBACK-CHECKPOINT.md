# Phase 8 Camera Far Clip Readback Checkpoint

Status: readback-only checkpoint packet

Date: 2026-04-27

## Current Main SHA

This checkpoint was prepared from:

```text
c41f9e1c9b1263f1fdd1a7807694a81a1d81c6a9
```

## Phase Workflow Stage

Readback-only checkpoint packet.

This checkpoint preserves the live-proven Camera far clip readback target as a
discovered-but-not-admitted target. It does not implement runtime behavior, run
Editor or bridge automation, admit public prompts, expose public property
listing, add write behavior, add restore behavior, or broaden the exact Camera
bool corridor.

## Checkpointed Target

The checkpointed target is:

```text
Camera :: Controller|Configuration|Far clip distance :: float
```

Live proof source:

```text
docs/PHASE-8-CAMERA-NON-BOOL-READBACK-LIVE-PROOF.md
backend/runtime/live_editor_scalar_target_discovery_proof_20260427-030832.json
```

The runtime proof JSON remains ignored and uncommitted.

## Proven Facts

The live proof established:

- component `Camera`
- property path `Controller|Configuration|Far clip distance`
- runtime value type `float`
- value preview `1024.0`
- component id provenance `admitted_runtime_component_add_result`
- selected target status `candidate_selected_readback_only`
- `read_only: true`
- `write_occurred: false`
- `write_admission: false`
- `restore_admission: false`
- `property_list_admission: false`
- `restore_result: restored_and_verified`
- `restore_succeeded: true`

## Current Admission State

The target remains readback-only.

It is not admitted for:

- public Prompt Studio writes
- public property-list exposure
- public `editor.component.property.write`
- public restore
- generic Camera property writes
- arbitrary Editor Python prompt behavior

The only admitted Camera property write/restore corridors remain:

```text
editor.component.property.write.camera_bool_make_active_on_activation
editor.component.property.restore.camera_bool_make_active_on_activation
```

for:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

## Future Work Boundary

Any future far clip write path must begin with a separate design-only packet and
explicit high-risk operator approval before public admission. That future design
must cover safe value ranges, read-before/write/read-after verification,
restore/revert behavior, approval wording, operator review fields, prompt
examples, and tests proving broad Camera writes and property listing remain
blocked.

Until that happens, far clip is a readback-only discovery target.

## Recommended Next Packet

If Phase 8 continues without explicit write approval, select another
already-allowlisted read-only target discovery candidate or produce a broader
readback-only checkpoint across the current Phase 8 discovered targets.

If explicit approval is granted later, create:

```text
codex/phase-8-camera-far-clip-write-candidate-design
```

That packet must remain design-only.

## Validation Commands For This Packet

This docs-only checkpoint should be validated with:

```powershell
git diff --check
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_prove_live_editor_scalar_target_discovery.py -q
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "editor_component_find or editor_component_property_get or camera_bool" -q
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "component_find or component_property_get or camera_bool" -q
Pop-Location
git diff --cached --check
```

## Revert Path

Revert the checkpoint commit. No runtime cleanup, dependency cleanup, proof
artifact cleanup, asset cleanup, material cleanup, render cleanup, build
cleanup, or TIAF cleanup should be required.
