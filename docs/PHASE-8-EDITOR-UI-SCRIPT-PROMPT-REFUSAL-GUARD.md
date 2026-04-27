# Phase 8 Editor UI And Script Prompt Refusal Guard

Status: refusal-coverage guard packet

Date: 2026-04-27

## Current Main SHA

This packet was prepared from:

```text
879197eccd0a75f0923e9813630ebf89b1aacf15
```

## Scope

This packet keeps editor-control prompts from silently planning session setup
for blocked Phase 8 GUI automation, hotkey, script, selection, duplicate, and
rename surfaces.

It does not admit any new editor command, arbitrary Editor Python, GUI
automation, hotkey automation, entity duplication, entity rename, or selection
behavior.

## Guard Added

Prompt planning now treats these editor-control requests as candidate editor
mutations:

```text
Open level "Levels/Main.level", run Python in the editor to change the selected entity.
Open level "Levels/Main.level", run an editor script to change the selected entity.
Open level "Levels/Main.level", press Ctrl+Z in the editor.
Open level "Levels/Main.level", use a hotkey to duplicate entity named "Hero".
Open level "Levels/Main.level", click the viewport toolbar to change camera settings.
Open level "Levels/Main.level", select entity named "Hero" in the editor.
Open level "Levels/Main.level", duplicate entity named "Hero" in the editor.
Open level "Levels/Main.level", rename entity named "Hero" to "Boss" in the editor.
```

They are refused with:

```text
editor.candidate_mutation.unsupported
```

## Preserved Boundary

The current admitted Phase 8 editor mutation surface remains limited to the
exact Camera bool write/restore corridors. Read-only entity existence,
component find, and property get paths remain unchanged.

## Validation

Validated with:

```powershell
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "candidate_editor_mutation or arbitrary_command_execution or entity_exists or component_find or camera_bool" -q
Pop-Location
git diff --check
```
