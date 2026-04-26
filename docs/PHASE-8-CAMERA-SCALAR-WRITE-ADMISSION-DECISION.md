# Phase 8 Camera Scalar Write Admission Decision

Status: historical admission decision packet, superseded by exact public corridor

Date: 2026-04-26

Superseding note:

The future corridor proposed here is now implemented as the exact public,
approval-gated capability
`editor.component.property.write.camera_bool_make_active_on_activation`.
See `docs/PHASE-8-CAMERA-BOOL-WRITE-PUBLIC-CORRIDOR.md` for the current
admitted boundary. Broad `editor.component.property.write` remains unadmitted.

This document decides the boundary for the proof-only Camera bool scalar write
evidence from PR #40.

It does not implement public property writes.

It does not admit `editor.component.property.write`.

It does not expose property writes through Prompt Studio, dispatcher/catalog, or
`/adapters`.

## Admission Decision

Keep the PR #40 Camera scalar write harness proof-only for now.

The proof is strong enough to become the basis for one future admitted public
corridor, but that corridor must be implemented in a separate operator-approved
PR with new public-admission tests, explicit review text, and rollback language.

The only possible future admitted corridor is:

```text
Camera bool scalar write for:
Controller|Configuration|Make active camera on activation?
```

Recommended future capability label:

```text
editor.component.property.write.camera_bool_make_active_on_activation
```

That label is a proposal only. It is not implemented or admitted by this
packet.

## 1. What PR #40 Proved

PR #40 added and live-proved a private proof-only Camera bool scalar write
harness.

Proof command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-scalar-write-proof
```

Ignored runtime artifact:

```text
backend/runtime/live_editor_camera_scalar_write_proof_20260426-163915.json
```

Exact target:

```text
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

Observed live proof evidence:

- original value read back as `true`
- inverse proof-only write set value to `false`
- changed value read back as `false`
- proof-only restore write set value back to `true`
- restored value read back as `true`
- loaded-level prefab restore completed with `restored_and_verified`
- component id provenance was `admitted_runtime_component_add_result`
- public admission flags remained false

## 2. What Remains Proof-Only

These remain proof-only:

- `editor.camera.scalar.write.proof`
- the Camera bool write/restore harness
- runtime proof JSON artifacts
- restore-boundary evidence for the temporary proof target
- scalar target discovery and proof-local property-list usage

The proof-only bridge path is review evidence. It is not a public user-facing
tool.

## 3. What Remains Publicly Unadmitted

These remain publicly unadmitted:

- `editor.component.property.write`
- broad property writes
- arbitrary Camera property editing
- arbitrary component/property writes
- public `editor.component.property.list`
- property writes through Prompt Studio
- property writes through dispatcher/catalog
- property writes through `/adapters`

Prompt Studio must still refuse property-write requests unless a future PR
explicitly admits the exact Camera bool corridor.

## 4. Meaning Of A Future Admitted Public Corridor

A future admitted public corridor would mean exactly this:

- a user may request toggling or setting the Camera bool
  `Controller|Configuration|Make active camera on activation?`
- the planner resolves only the exact admitted label or exact path
- the runtime writes only a boolean value for that exact path
- the operation requires approval as a real editor mutation
- every execution returns before/write/after/restore evidence
- the public surface names the narrow Camera bool operation, not a general
  property-write tool

It would not mean that users can edit arbitrary Camera properties.

It would not mean that users can provide arbitrary component ids or property
paths.

## 5. What Must Stay Forbidden

Even if the exact Camera bool corridor is admitted later, these stay forbidden:

- arbitrary `SetComponentProperty`
- `PropertyTreeEditor.set_value`
- arbitrary Editor Python
- public property-list discovery
- asset, material, mesh, render, shader, LOD, lighting, build, or TIAF
  mutation
- transform, hierarchy, parenting, prefab, or delete mutation
- generalized undo claims
- generalized cleanup or reversibility claims
- accepting prefab-derived component ids as live write targets
- accepting stale, guessed, or operator-supplied component ids without live
  verification

## 6. Future Prompt Wording That Could Be Allowed

Only after a separate admission PR, prompts like these could be allowed:

- "Toggle make active camera on activation on the proof Camera."
- "Set the Camera make-active-on-activation flag to false."
- "Change the admitted Camera bool property
  `Controller|Configuration|Make active camera on activation?` to true."

Allowed wording must map to the exact Camera bool corridor and a live runtime
component target with trustworthy provenance.

## 7. Prompt Wording That Must Still Be Refused

These must still be refused:

- "Set any Camera property."
- "Change this component property path."
- "Write `Controller|Configuration|Field of View`."
- "Edit the Mesh model asset path."
- "Set a material/render/shader/asset property."
- "Run Editor Python to change the property."
- "List properties and then write one."
- "Use this prefab component id to write a live property."
- "Set whatever property looks like make active camera."

Refusal should continue to use the existing candidate-mutation refusal class
until a future exact corridor is admitted.

## 8. Approval Class

A future public corridor should require an approval-gated editor mutation lock.

It should not be treated as read-only, plan-only, or low-risk automation. The
target is narrow and proven, but it still mutates the live editor level.

Recommended approval language:

```text
Approve one exact Camera bool scalar write:
Camera :: Controller|Configuration|Make active camera on activation? :: bool
```

## 9. Evidence Every Write Must Return

Every future admitted write must return:

- selected project, engine, and level
- entity id and entity name
- component id
- component id provenance
- component name exactly `Camera`
- property path exactly
  `Controller|Configuration|Make active camera on activation?`
- property type exactly `bool`
- requested value
- before value
- write result
- after value
- restore strategy
- restore result
- restored value or exact post-restore blocker
- public admission label used
- approval id or proof of approval gate
- final review text naming what was and was not proven

The operation must fail closed if it cannot produce the required evidence.

## 10. Allowed Restore/Rollback Claim

Allowed claim:

```text
The operation restored the exact Camera bool value and hash-verified the
selected loaded-level prefab restore boundary for this proof/admitted run.
```

This claim is allowed only when before/write/after/restore/readback evidence is
present in the run result.

## 11. Restore/Rollback Claim Not Allowed

Do not claim:

- generalized undo
- viewport reload
- broad level cleanup
- arbitrary editor-state rollback
- entity absence after cleanup unless separately read back and proven
- rollback for any other Camera property
- rollback for arbitrary component/property writes

The repo may claim only the restore behavior it actually performs and verifies.

## 12. Likely Future Implementation Files

A future admission implementation would likely touch:

- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/catalog.py`
- `backend/runtime/prove_live_editor_camera_scalar_write.py`
- `backend/runtime/live_verify_control.ps1`
- `scripts/dev.ps1`
- `scripts/setup_control_plane_editor_bridge.ps1`
- `backend/runtime/editor_scripts/control_plane_bridge_ops.py`
- `backend/tests/test_prompt_control.py`
- `backend/tests/test_editor_automation_runtime.py`
- `backend/tests/test_prove_live_editor_camera_scalar_write.py`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- `docs/CURRENT-STATUS.md`

If the bridge script is generated from another source, change the generator
source instead of only hand-editing generated output.

## 13. Files And Areas That Must Not Be Touched

A future admission PR must not touch:

- `.venv/`
- dependency files
- GitHub settings or branch protection
- unrelated frontend code
- broad component/property allowlists
- public `editor.component.property.list` admission
- arbitrary Editor Python surfaces
- asset, material, render, build, or TIAF behavior
- branch cleanup or destructive git operations

Runtime proof JSON and restore-boundary prefab artifacts must stay ignored
unless a separate committed checkpoint summary is intentionally added.

## 14. Tests Required Before Public Admission

Required tests before public admission:

- Prompt Studio admits only the exact Camera bool label/path.
- Prompt Studio still refuses arbitrary property writes.
- Prompt Studio still refuses non-Camera property writes.
- Prompt Studio still refuses non-selected Camera property paths.
- dispatcher/catalog expose only the narrow future label, if admitted.
- `/adapters` exposes only the narrow future label, if admitted.
- `/adapters` still does not expose public property list.
- runtime rejects non-Camera components.
- runtime rejects non-bool values.
- runtime rejects mismatched property paths.
- runtime rejects component ids without live provenance.
- runtime rejects missing approval.
- runtime rejects missing restore boundary.
- runtime records before/write/after/restore/readback evidence.
- restore failure prevents success.
- property-list admission remains false unless separately admitted.
- no arbitrary Editor Python path exists.

## 15. Live Proof Required Before Public Admission

Before public admission, rerun:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-scalar-write-proof
```

The proof must again verify:

- before value is bool
- inverse write succeeds
- changed readback matches the inverse value
- original value restore succeeds
- restored readback matches the original value
- loaded-level restore is `restored_and_verified`
- no public property list/write exposure is present before admission

If this live proof fails, do not admit the corridor.

## 16. Smallest Safe Future Implementation PR

The smallest safe future implementation PR is:

```text
Admit exact Camera bool scalar write corridor
```

It should add only:

- one explicit public capability label:
  `editor.component.property.write.camera_bool_make_active_on_activation`
- one exact Camera bool target binding
- one approval-gated runtime write path for the selected property
- public refusal tests for every non-exact property-write prompt
- adapter/catalog/prompt tests proving no broad property write/list admission
- updated matrices and status docs
- a fresh live proof checkpoint summary

It should not introduce a general `editor.component.property.write` surface.

## 17. Revert Path If Public Admission Causes Problems

If a future public admission causes problems:

1. Revert the public-admission PR merge commit.
2. Confirm Prompt Studio property-write prompts are refused again.
3. Confirm dispatcher/catalog no longer expose the admitted Camera bool label.
4. Confirm `/adapters` no longer exposes the admitted Camera bool label.
5. Keep proof-only harness artifacts ignored.
6. Leave PR #40 proof docs intact as historical evidence unless the proof was
   invalidated by new facts.

Do not rewrite history and do not delete `main`.

## Current Decision Summary

Current state:

- private proof-only Camera bool write harness: proven
- public exact Camera bool write corridor: not admitted
- broad property writes: forbidden
- public property list: not admitted
- arbitrary Editor Python: forbidden

Recommended next slice:

- implement the exact Camera bool public corridor only if the operator approves
  that higher-risk admission packet
- otherwise keep using the PR #40 proof as review evidence and continue
  read-only discovery/proof-only Phase 8 work

## Revert Path For This Packet

This packet is docs-only.

To revert it after merge:

```powershell
git revert -m 1 <merge-commit-sha>
```

If reverted before merge, delete this branch:

```powershell
git branch -D codex/phase-8-camera-write-admission-decision
```
