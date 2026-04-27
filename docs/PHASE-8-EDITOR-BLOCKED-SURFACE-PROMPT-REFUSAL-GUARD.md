# Phase 8 Editor Blocked Surface Prompt Refusal Guard

Status: refusal-coverage guard packet

Date: 2026-04-27

## Current Main SHA

This packet was prepared from:

```text
23c0d82e610d6f59d7a152735a7305dda8348b62
```

## Scope

This packet keeps editor-control prompts from silently planning session setup
for blocked Phase 8 editor mutation surfaces.

It does not change admitted render, build, asset, or material capabilities in
their own domains. It only preserves the Phase 8 editor component/property
corridor boundary.

## Guard Added

Prompt planning now treats these editor-control requests as candidate editor
mutations:

```text
Open level "Levels/Main.level", change render setting exposure to 1.0 in the editor.
Open level "Levels/Main.level", change build setting "profile" in the editor.
Open level "Levels/Main.level", update TIAF state for the current level.
Open level "Levels/Main.level", execute Python in the editor to change the selected entity.
```

They are refused with:

```text
editor.candidate_mutation.unsupported
```

## Preserved Boundary

The following remain blocked inside the Phase 8 editor component/property
corridor:

- arbitrary Editor Python
- render setting mutation
- build setting mutation
- TIAF state mutation
- asset/material/render/build mutation through editor property workflows
- broad editor mutation outside the exact admitted Camera bool corridors

The exact Camera bool write/restore corridors remain unchanged.

## Validation

Validated with:

```powershell
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "candidate_editor_mutation or arbitrary_command_execution or camera_bool" -q
Pop-Location
git diff --check
```
