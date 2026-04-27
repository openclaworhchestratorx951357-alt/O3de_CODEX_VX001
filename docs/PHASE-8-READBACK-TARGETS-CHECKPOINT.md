# Phase 8 Readback Targets Checkpoint

Status: readback target checkpoint packet

Date: 2026-04-27

## Current Main SHA

This checkpoint was prepared from:

```text
e269a029d61f521eeb4e480b5d0be9bf2b6bb358
```

## Phase Workflow Stage

Readback target checkpoint packet.

This packet summarizes the current Phase 8 readback target map after the Camera
far clip checkpoint. It does not implement runtime behavior, run Editor or
bridge automation, admit public prompts, expose public property listing, add
write behavior, add restore behavior, or broaden the exact Camera bool corridor.

## Target Map

| Target | Evidence State | Admission State | Next Gate |
| --- | --- | --- | --- |
| `Camera :: Controller|Configuration|Make active camera on activation? :: bool` | Live-proven read/write/restore sequence. | Exact public write and exact public restore admitted. | Maintain as the only admitted Camera property write/restore corridor. |
| `Mesh :: Controller|Configuration|Model Asset` | Live-proven readback-only property target evidence. | Readback-only; asset reference is blocked as a write target. | Keep blocked for first scalar write target selection. |
| `Comment :: <empty/root path> :: AZStd::string metadata` | Live proof reached property tree root readback but returned non-scalar object. | Blocked; no scalar/text candidate selected. | Keep as blocker/regression evidence unless a new read-only strategy is designed. |
| `Camera :: Controller|Configuration|Far clip distance :: float` | Live-proven readback-only candidate with value preview `1024.0`. | Discovered-but-not-admitted; readback-only. | Optional future design-only packet before any write consideration. |

## Current Admitted Surface

The only admitted Camera property write corridor remains:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

The only admitted Camera property restore corridor remains:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
```

Both corridors apply only to:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

They do not admit generic property writes, arbitrary Camera writes, generic
restore, generalized undo, public property listing, or arbitrary Editor Python.

## Readback-Only Evidence

Readback-only evidence currently includes:

- exact Camera bool inspection through the admitted component find/property get
  path
- Mesh model asset readback as asset-reference evidence
- Camera far clip float readback as a discovered non-bool scalar target

These do not imply write readiness.

## Blocked Evidence

Blocked evidence currently includes:

- Comment root string metadata, because live `PropertyTreeEditor.get_value("")`
  returned a shaped non-scalar object
- Mesh scalar-like/render-adjacent property paths, because they are asset,
  material, render, or grouping adjacent for first write target selection
- Camera far clip writes, because float write safety, range rules, review
  wording, restore semantics, and prompt examples have not been designed or
  approved

## Future Slice Options

Safe next packets without explicit write approval:

- select another already-allowlisted read-only discovery candidate
- refresh readback-only operator examples for known safe readback requests
- audit the current prompt refusal examples for generic property writes and
  public property listing
- produce report-first branch or proof-artifact hygiene docs

High-risk future packets requiring explicit approval before public admission:

- Camera far clip write proof implementation
- Camera far clip public write admission
- Camera far clip public restore admission
- public property-list admission
- generic Camera or generic component property writes

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
