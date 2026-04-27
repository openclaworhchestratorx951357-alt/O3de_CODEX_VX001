# Phase 8 Camera Scalar Prompt Refusal Guard

Status: refusal-coverage guard packet

Date: 2026-04-27

## Current Main SHA

This packet was prepared from:

```text
4d0b61b732742a2894efdf6a1c9f7546db5c7f0d
```

## Scope

This packet keeps Camera scalar properties outside public write admission unless
they are the already-admitted exact Camera bool path.

It does not admit generic Camera writes, public property listing, public
property discovery, Camera far clip writes, Camera far clip restore, generic
restore, or arbitrary Editor Python.

## Guard Added

Prompt planning now treats natural Camera scalar write wording as candidate
editor mutation, even when the operator does not use the word `property`.

Guarded examples include:

```text
Open level "Levels/Main.level", set the Camera field of view on entity named "ShotCamera" to 60.
Open level "Levels/Main.level", change near clip distance on the Camera component for entity named "ShotCamera" to 0.1.
Open level "Levels/Main.level", modify the Camera frustum width on entity named "ShotCamera" to 20.
```

These are refused with:

```text
editor.candidate_mutation.unsupported
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

All other Camera scalar write prompts remain refused until a future design-only
packet, proof packet, admission packet, and explicit approval gate say
otherwise.

## Validation

Validated with:

```powershell
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "candidate_editor_mutation or camera_bool_write or camera_bool_restore or component_property_discovery" -q
Pop-Location
git diff --check
```
