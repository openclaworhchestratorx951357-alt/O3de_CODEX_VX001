# Phase 8 Far Clip Prompt Refusal Guard

Status: refusal-coverage guard packet

Date: 2026-04-27

## Current Main SHA

This packet was prepared from:

```text
900b6274a55122204d3573d2b8d95c7ad230a02f
```

## Scope

This packet keeps the live-proven Camera far clip float target readback-only.
It does not admit a Camera far clip write corridor, a Camera far clip restore
corridor, generic Camera writes, public property listing, public property
discovery, or arbitrary Editor Python.

## Guard Added

Prompt planning now treats natural Camera far clip write wording as a candidate
editor mutation request requiring the existing Phase 8 mutation admission gate.

Guarded examples include:

```text
Open level "Levels/Main.level", set the Camera far clip distance on entity named "ShotCamera" to 512.
Open level "Levels/Main.level", change far clip distance on the Camera component for entity named "ShotCamera" to 512.
```

Both are refused with:

```text
editor.candidate_mutation.unsupported
```

Camera far clip restore wording remains refused through the generic restore
gate:

```text
editor.restore.unsupported
```

## Preserved Boundary

The only admitted Camera property write corridor remains:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

The only admitted Camera property restore corridor remains:

```text
editor.component.property.restore.camera_bool_make_active_on_activation
```

Both apply only to:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

The Camera far clip target remains:

```text
Camera :: Controller|Configuration|Far clip distance :: float
```

Admission state:

- readback-only
- discovered-but-not-admitted
- no write admission
- no restore admission
- no public property-list admission

## Validation

Validated with:

```powershell
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "candidate_editor_mutation or generic_restore_prompts or component_property_discovery" -q
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "property_list_write_and_proof_only_tools or broad_property_write_and_list_surfaces or camera_bool" -q
.\.venv\Scripts\python.exe -m pytest tests\test_catalog.py -k "property_write_list or camera_bool" -q
Pop-Location
git diff --check
```
