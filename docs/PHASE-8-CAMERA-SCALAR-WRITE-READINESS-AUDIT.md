# Phase 8 Camera Scalar Write Readiness Audit

Status: readiness audit only

This audit checks whether the repository has the safety gates required before a
future proof-only Camera bool property write harness.

It does not implement property writes.

It does not admit `editor.component.property.write`.

It does not expose property writes through Prompt Studio, dispatcher/catalog, or
`/adapters`.

## Summary Verdict

The repository is not ready to implement a Camera bool write proof
automatically.

The repository is ready to discuss a future operator-approved proof-only
implementation packet if that packet stays limited to the Camera bool candidate
and adds the required tests, preflight gates, write evidence, restore evidence,
and post-restore readback evidence.

## Evidence Sources

This audit is based on:

- `docs/PHASE-8-CAMERA-SCALAR-WRITE-CANDIDATE-DESIGN.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-WRITE-CANDIDATE.md`
- `docs/PHASE-8-EDITOR-SCALAR-PROPERTY-TARGET-DISCOVERY.md`
- `docs/PHASE-8-EDITOR-COMPONENT-PROPERTY-TARGET-DISCOVERY.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- existing prompt-control and proof-harness refusal expectations

Docs remain weaker evidence than code, tests, and live proof artifacts. If
future validation contradicts this audit, update this audit in a narrow
follow-up packet.

## 1. Candidate-Only Status

Yes. The selected Camera bool path is still documented as candidate-only.

Current selected readback-only candidate:

- component: `Camera`
- property path:
  `Controller|Configuration|Make active camera on activation?`
- runtime value type: `bool`
- candidate status: `readback_only_candidate`
- write admission: `false`
- property-list admission: `false`

The design packet states that the Camera bool path is a future proof target, not
a Prompt Studio admission and not a public write surface.

## 2. Prompt Studio Property-Write Refusal

Property writes must still be refused in Prompt Studio.

Required current behavior:

- prompts asking to set, change, toggle, or modify component properties remain
  refused
- refusal reason remains `editor.candidate_mutation.unsupported`
- no editor session plan is created for a property-write prompt
- no `editor.component.property.write` step is planned

Any future proof-only write harness must not change this behavior. Public prompt
admission would require a separate admission slice after proof review.

## 3. Property List Proof-Only Status

`editor.component.property.list` is still proof-only.

Required current behavior:

- not Prompt Studio admitted
- not dispatcher/catalog admitted
- not exposed through `/adapters`
- usable only by bounded proof harnesses or proof-local bridge paths

A future Camera bool write proof should rely on the already selected readback
candidate. It must not admit public property listing as a shortcut.

## 4. `/adapters` Exposure

`/adapters` must remain free of property list and property write exposure.

Required current behavior:

- `editor.component.property.get` may remain exposed as the admitted read-only
  path
- `editor.component.property.list` must not be exposed
- `editor.component.property.write` must not be exposed

A future proof packet must include a preflight that fails closed if public
property list or write exposure is detected.

## 5. Tests Needed Before Implementation

Before any implementation packet, these tests must exist or be explicitly added
in the same implementation PR.

Prompt and surface refusal tests:

- property-write prompts are refused with
  `editor.candidate_mutation.unsupported`
- Camera-specific prompts such as "toggle the Camera active flag" remain
  refused until a separate admission slice exists
- `editor.component.property.write` is not in dispatcher/catalog
- `editor.component.property.write` is not exposed through `/adapters`
- `editor.component.property.list` remains proof-only and not publicly admitted

Proof-harness safety tests:

- the proof rejects missing operator approval
- the proof rejects stale or missing bridge heartbeat
- the proof rejects unsafe or ambiguous levels
- the proof rejects non-live component ids
- the proof rejects any component other than `Camera`
- the proof rejects any property path other than
  `Controller|Configuration|Make active camera on activation?`
- the proof rejects non-bool requested values
- the proof refuses mutation without a fresh restore boundary
- before-value readback failure prevents mutation
- write failure reports the exact blocker
- after-value readback failure prevents proof success
- restore failure prevents proof success
- post-restore readback failure records an exact blocker and does not admit
  property writes
- public property list or write exposure causes proof failure
- no arbitrary Editor Python path is introduced
- no `PropertyTreeEditor.set_value` path is used

Artifact and policy tests:

- runtime proof JSON remains ignored unless a separate checkpoint summary is
  intentionally committed
- proof-only status is preserved in docs and matrices until a later admission
  packet
- write admission and property-list admission fields remain false before
  admission

## 6. Required Restore And Readback Proof

A future proof must prove the entire before/write/after/restore/readback
sequence in one evidence bundle before any success claim.

Required proof flow:

1. Verify canonical backend, target, and bridge readiness.
2. Verify the selected safe level, preferably `Levels/TestLoevel01`.
3. Create or select only a proof-owned temporary entity.
4. Add or bind a `Camera` component through live runtime provenance.
5. Read the selected bool property before mutation.
6. Create a fresh loaded-level restore boundary.
7. Write the boolean opposite of the before value.
8. Read the selected bool property after mutation.
9. Restore from the pre-mutation backup.
10. Verify restored file hash.
11. Reacquire the target if restore invalidates the live component id.
12. Read back the post-restore value or report the exact blocker.

Required success evidence:

- before value is a bool
- requested value is a bool and differs from before value
- write result is successful
- after value matches requested value
- restore is invoked
- restore is hash-verified
- post-restore readback succeeds, or the artifact stays proof-only and records a
  reload-aware blocker
- final review states that public write admission remains false

If restore fails, the proof must not report success.

## 7. Required Operator Approval

Explicit operator approval is required before implementation.

The approval must name:

- branch name
- proof command name
- component: `Camera`
- exact property path:
  `Controller|Configuration|Make active camera on activation?`
- proof-only status
- no Prompt Studio, dispatcher/catalog, or `/adapters` admission
- no public `editor.component.property.list`
- required restore and post-restore readback evidence
- no arbitrary Editor Python
- no asset, material, render, build, or TIAF behavior

The existing design and this audit are not approval to implement the write
corridor.

## 8. Likely Future Implementation Files

If explicitly approved, a future implementation would likely touch only a small
set of proof-local files:

- `backend/runtime/prove_live_editor_camera_scalar_write.py`
- `backend/runtime/live_verify_control.ps1`
- `scripts/dev.ps1`
- `scripts/setup_control_plane_editor_bridge.ps1`
- `backend/runtime/editor_scripts/control_plane_bridge_ops.py`
- `backend/tests/test_prove_live_editor_camera_scalar_write.py`
- `backend/tests/test_prompt_control.py`
- `docs/PHASE-8-CAMERA-SCALAR-WRITE-CANDIDATE-DESIGN.md`
- `docs/REMOTE-AUTOMATION-SURFACE-MATRIX.md`
- `docs/CAPABILITY-MATURITY-MATRIX.md`

If the bridge script is generated from another source file, the generator source
must be changed instead of manually editing generated output only.

## 9. Files And Areas That Must Not Be Touched

A future proof-only implementation must not touch:

- `.venv/`
- dependency files
- GitHub settings or branch protection
- unrelated frontend code
- arbitrary dispatcher/catalog admission
- Prompt Studio public admission for property writes
- `/adapters` public exposure for property list or write
- broad component or property allowlists
- arbitrary Editor Python execution paths
- asset, material, render, build, or TIAF behavior
- live Editor undo claims
- viewport reload claims unless separately implemented and verified
- runtime proof JSON artifacts unless a separate committed checkpoint summary is
  intentionally created

The future implementation must not use:

- `PropertyTreeEditor.set_value`
- arbitrary `SetComponentProperty` calls outside the exact proof-only Camera
  bool corridor
- `editor.component.property.write` as a public admitted tool

## 10. Safest Future Branch And PR Title

Recommended future branch:

```text
codex/phase-8-camera-scalar-write-proof-only
```

Recommended future PR title:

```text
Add proof-only Camera scalar write harness
```

Recommended future proof command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 live-camera-scalar-write-proof
```

Recommended future artifact pattern:

```text
backend/runtime/live_editor_camera_scalar_write_proof_<YYYYMMDD-HHMMSS>.json
```

These names are proposals only. Do not add the command or artifact until the
operator explicitly approves implementation.

## Current Blockers

Current blockers before implementation:

- no explicit operator approval for a write implementation packet
- no proof-only Camera write harness exists
- no bridge/runtime write operation is implemented
- no before/write/after/restore/post-restore evidence bundle exists
- no reload-aware component reacquisition proof exists after restore
- no implementation tests exist for the future proof harness failure modes
- no admission decision exists after proof review

These blockers are intentional safety gates, not defects.

## Revert Path

This audit is docs-only.

To revert it after merge:

```powershell
git revert -m 1 <merge-commit-sha>
```

If reverted before merge, delete this branch:

```powershell
git branch -D codex/phase-8-camera-write-readiness-audit
```
