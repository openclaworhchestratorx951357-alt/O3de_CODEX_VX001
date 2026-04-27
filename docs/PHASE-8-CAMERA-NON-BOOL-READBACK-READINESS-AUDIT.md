# Phase 8 Camera Non-Bool Readback Readiness Audit

Status: normalized phase readiness audit packet

Date: 2026-04-27

## Current Main SHA

This readiness audit was prepared from:

```text
7ced5a42e96a3f0b9d24ccb02e88c184d89dd97c
```

## Phase Workflow Stage

Readiness audit packet.

This packet audits whether the design in
`docs/PHASE-8-CAMERA-NON-BOOL-READBACK-DESIGN.md` is ready to move into a
proof-only implementation packet. It does not implement runtime behavior, run
Editor or bridge automation, admit public property listing, admit public prompt
behavior, add write behavior, add restore behavior, or broaden the exact Camera
bool corridor.

## Readiness Decision

Camera non-bool scalar readback is ready for a narrow proof-only implementation
packet.

It is not ready for public prompt admission, public property-list admission, a
write corridor, or a restore corridor.

Reason:

- the existing scalar target discovery helper already has a proof-only
  readback/classification substrate
- Camera is already in the admitted component-add/find allowlist
- runtime provenance rules for Camera component ids are established
- existing tests cover the current Camera bool corridor and proof-only scalar
  target discovery boundaries
- the remaining work is narrow: exclude the admitted Camera bool path, add
  non-bool readback classifications, and prove blocked output if only
  render-adjacent values are available

## Readiness Checklist

| Gate | Status | Evidence | Implication |
| --- | --- | --- | --- |
| Existing discovery/design packets | Ready | `docs/PHASE-8-NEXT-READ-ONLY-TARGET-DISCOVERY.md` and `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-DESIGN.md`. | The scope is documented before implementation. |
| Component allowlist | Ready | `EDITOR_COMPONENT_ADD_ALLOWLIST = ("Camera", "Comment", "Mesh")`. | Camera may be used without adding component types. |
| Runtime provenance | Ready | Existing proof helpers require `admitted_runtime_component_add_result`; `editor.component.find` uses admitted runtime discovery provenance. | Future proof can keep live ids auditable. |
| Proof helper substrate | Ready | `backend/runtime/prove_live_editor_scalar_target_discovery.py` already probes Camera and Comment and rejects write/property-list admission flags. | A narrow helper change can remain proof-only. |
| Source hints | Ready | The helper already scans Camera source hints including `m_fov`, `m_near`, `m_far`, and `m_orthographic`. | Non-bool Camera readback candidates have a source-guided search path. |
| Existing tests | Ready with required additions | Current tests cover scalar discovery boundaries, Camera bool write/restore, dispatcher, and prompt-control behavior. | Add specific non-bool exclusion/classification tests in the proof-only packet. |
| Public admission boundary | Ready | Current docs and tests keep generic writes, public property listing, and arbitrary Camera writes blocked. | Future packet must not change planner/catalog/admission state. |
| Exact non-bool candidate | Not required before proof-only | Live proof may select a non-bool candidate or return a blocker. | Successful blocked output is acceptable. |
| Live proof run | Pending future packet | This audit does not run Editor or bridge automation. | Future proof-only implementation should run the proof if the local editor target is available. |

## Required Implementation Constraints

The future proof-only implementation must:

1. Exclude `Controller|Configuration|Make active camera on activation?`.
2. Keep `Camera` as the only newly probed target class for this slice.
3. Preserve `Comment` only as existing regression evidence if reused.
4. Preserve `Mesh` exclusion for first write-target expansion.
5. Return a precise blocker if no non-bool Camera scalar candidate is proven.
6. Keep `write_admission: false`.
7. Keep `restore_admission: false`.
8. Keep `property_list_admission: false`.
9. Keep public Prompt Studio planner behavior unchanged.
10. Keep dispatcher/catalog/adapters public surfaces unchanged.
11. Keep runtime proof JSON ignored unless a later checkpoint commits a
    summary.

## Implementation Touchpoints For The Next Packet

The narrow likely touchpoints are:

- `backend/runtime/prove_live_editor_scalar_target_discovery.py`
- `backend/tests/test_prove_live_editor_scalar_target_discovery.py`
- `docs/PHASE-8-CAMERA-NON-BOOL-READBACK-PROOF.md`, if a proof packet records
  live or blocked proof evidence
- `docs/README.md`
- `docs/CURRENT-STATUS.md`

Only if the implementation proves a new artifact field is needed should it
touch adjacent proof-helper tests. It should not touch public schemas or
surface matrix wording unless admission state changes, which this path must not
do.

## Files And Paths That Must Not Be Touched

The future proof-only implementation must not touch:

- `.venv/`
- `backend/.venv/`
- `frontend/node_modules/`
- public tool schemas for write/restore admission
- planner admission logic for generic property writes
- catalog or capability-registry admission for public property listing
- `/adapters` exposure for `editor.component.property.list`
- exact Camera bool public write/restore corridor behavior
- runtime proof JSON except as ignored local output
- source assets, product assets, materials, render assets, build files, or TIAF
  files

## Required Tests For The Next Packet

The proof-only implementation should add or update tests that prove:

- the admitted Camera bool path is excluded from non-bool candidate selection
- non-bool scalar candidates keep `write_admission: false`
- non-bool scalar candidates keep `restore_admission: false` or omit restore
  admission truthfully
- property-list public admission stays false
- render/asset/material/prefab/hierarchy/build-adjacent paths are rejected
- shaped/container values are rejected
- blocked output uses a precise non-bool Camera blocker
- exact Camera bool write tests still pass
- exact Camera bool restore tests still pass
- prompt-control generic property-write refusal tests still pass

## Risk And Approval

This readiness audit is low risk because it is docs-only.

The next proof-only implementation is medium risk because it changes a live
proof helper and tests, but it remains acceptable for self-merge if:

- it does not alter public admission
- targeted tests pass
- CI passes
- any live proof artifact remains ignored
- the PR body states no public prompt, write, restore, or property-list
  expansion occurred

Any later packet that proposes public non-bool Camera write, public prompt
admission, public property-list admission, generic restore, or generalized undo
is high risk and requires explicit operator approval.

## Safest Future Branch Name

Create:

```text
codex/phase-8-camera-non-bool-readback-proof-only
```

That packet may implement the proof-only helper change and tests. It must not
create a public corridor or admission decision.

## Validation Commands For This Packet

This docs-only packet should be validated with:

```powershell
git diff --check
Push-Location backend
.\.venv\Scripts\python.exe -m pytest tests\test_dispatcher.py -k "editor_component_find or editor_component_property_get or camera_bool" -q
.\.venv\Scripts\python.exe -m pytest tests\test_prompt_control.py -k "component_find or component_property_get or camera_bool" -q
Pop-Location
git diff --cached --check
```

Run `surface-matrix-check` only if a later packet changes surface labels,
admission state, or matrix wording.

## Revert Path

Revert the commit that adds this readiness audit and its index/status pointers.
No runtime cleanup, dependency cleanup, proof artifact cleanup, or asset cleanup
should be required.
