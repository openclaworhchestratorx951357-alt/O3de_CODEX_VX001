# Phase 8 Editor State Toggle Prompt Refusal Guard

Status: refusal-coverage guard packet

Date: 2026-04-27

## Current Main SHA

This packet was prepared from:

```text
bb422b7bfb48e32bed9c0eee84a30d6cf6d69812
```

## Scope

This packet keeps editor-control prompts from silently planning session setup
for blocked Phase 8 entity/component state and transform mutation surfaces.

It does not admit transform writes, entity visibility changes, entity lock
changes, entity activation changes, or component enable/disable behavior.

## Guard Added

Prompt planning now treats these editor-control requests as candidate editor
mutations:

```text
Open level "Levels/Main.level", set transform on entity named "Hero" to origin.
Open level "Levels/Main.level", hide entity named "Hero" in the editor.
Open level "Levels/Main.level", lock entity named "Hero" in the editor.
Open level "Levels/Main.level", enable Mesh component on entity named "Hero".
Open level "Levels/Main.level", activate entity named "Hero".
```

They are refused with:

```text
editor.candidate_mutation.unsupported
```

## Preserved Boundary

Read-only entity existence, component find, and property get paths remain
unchanged. The only admitted editor property mutation corridors remain the exact
Camera bool write/restore corridors.

## Validation

Validated with:

```powershell
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "candidate_editor_mutation or entity_exists or component_find or component_property_readback or camera_bool" -q
Pop-Location
git diff --check
```
