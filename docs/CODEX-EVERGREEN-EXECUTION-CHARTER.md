# CODEX EVERGREEN EXECUTION CHARTER

Status: evergreen source document
Purpose: stable operating guidance for Codex and operators
Imported into the repo from the bundle-baseline roadmap on 2026-04-22 so future
threads can use a repo-native reference instead of relying on an external
download path.

Use this as the control law for reaching the project goals without having to
rewrite the roadmap as implementation progresses.

## How to use this document

This document is intentionally **not** a sprint plan.
It is an execution charter that tells Codex how to decide what to do next from
the repo's **current** truth.

Do **not** rewrite this file every time a capability advances.
Instead:

- keep this charter stable
- treat code, tests, and runtime behavior as the current truth source
- require each Codex work packet to report the **capability delta** it achieved
- treat those packet outputs as the living status trail

Only update this charter if one of these changes materially:

- the end goal
- the truth hierarchy
- the safety model
- the stage definitions
- the capability promotion gates
- the repo topology enough that the referenced file families are no longer the right touchpoints

---

## 1. Mission

Build an O3DE-based natural-language operating layer that can safely create,
edit, validate, review, and eventually ship AAA-quality games, cinematics,
films, and related media workflows through prompting, while preserving:

- reversibility
- auditability
- approvals
- evidence
- operator control

The fastest acceptable path is **not** maximum breadth.
The fastest acceptable path is the shortest route to a **dependable
admitted-real vertical slice** that can be proven, reviewed, and extended
without lying about capability.

---

## 2. Non-negotiable rules

1. **Code/tests/runtime outrank docs.**
   If stale docs or README text disagree with code, tests, or observed runtime
   behavior, trust code/tests/runtime.

2. **Do not treat the repo as research-only.**
   If a real or gated-real slice already exists, start from it.

3. **Never demote already-real capability back into "future vision."**
   Preserve admitted-real slices as the starting line.

4. **Shortest path to dependable operation beats breadth.**
   Prefer one narrow, proven, reviewable lane over five speculative lanes.

5. **Read-first before write. Review before breadth. Reversibility before autonomy.**

6. **No capability may be called real unless it has all of:**
   - a real runtime-reaching path
   - targeted tests
   - evidence capture
   - truthful policy/admission labeling

7. **No capability may be called undoable unless it has one of:**
   - explicit reverse operations
   - snapshot/restore semantics
   - proven rollback logic

8. **No arbitrary command passthrough.**
   Do not collapse the safety model by exposing arbitrary shell, arbitrary
   Python, arbitrary Editor script execution, or unrestricted file mutation as a
   prompt surface.

9. **High-risk domains stay gated until proven.**
   Especially:
   - asset/material mutation
   - prefab/path/UUID-sensitive operations
   - rendering/shader automation
   - generalized content undo
   - full build/test execution

10. **Every write path must have a review path.**
    If a write cannot be read back truthfully, it is not ready for broader exposure.

11. **Every work packet must be small and verifiable in one pass.**

12. **Docs should follow code truth, not replace it.**
    After a capability is promoted, align docs/copy with reality.

---

## 3. What "fully operational" means in stages

| Stage | Meaning | Exit condition |
|---|---|---|
| **Stage 1 - dependable prompt-driven scene-authoring foundation** | A prompt can safely drive a narrow real editor-authoring loop. | One prompt can attach/open Editor, open a level, create a named entity, add an admitted allowlisted component, and return trustworthy review evidence. |
| **Stage 2 - dependable content/application workflow** | The system can safely inspect and mutate a narrow configuration lane while keeping build actions truthful. | `project.inspect` is dependable, admitted `settings.patch` is reviewable and reversible, and `build.configure` is dependable as plan/preflight without pretending to compile. |
| **Stage 3 - dependable validation/review/rollback workflow** | The system can prove what changed and can reverse or restore claimed reversible operations. | Every exposed mutation path has post-action review; config rollback is real; editor/content undo is explicit or snapshot-based before being advertised. |
| **Stage 4 - expandable AAA media-production platform** | Additional domains can be added without losing truthfulness or control. | Asset, render, validation, export, media-review, and related lanes are added only as admitted-real subsets with evidence, approvals, and reversibility. |

These stages are stable and should not need routine editing.
What changes over time is the repo's position within them.

---

## 4. Capability maturity ladder

Use this ladder to classify every capability during baseline verification and
after every work packet.

| Level | Label | Meaning |
|---|---|---|
| **M0** | missing | No meaningful implementation path exists. |
| **M1** | contract-only | Planner/catalog/schema/policy naming exists, but no dependable execution path. |
| **M2** | simulated fallback | The system can pretend or stub behavior, but does not perform the real operation. |
| **M3** | plan-only | The system can preflight or plan truthfully, but not safely execute the mutation. |
| **M4** | gated real | A real path exists, but only inside a tightly admitted scope with strong constraints. |
| **M5** | real but narrow | A dependable real path exists for a constrained subset of the domain. |
| **M6** | reviewable real | The real path also has truthful readback / verification and operator-facing review evidence. |
| **M7** | reversible real | The real path is reviewable and has explicit rollback / reverse / restore semantics. |
| **M8** | scalable admitted-real | The capability is narrow-but-solid, documented, ergonomically promptable, and safe to widen incrementally. |

### Promotion rules

A capability may only move upward when the missing gate is actually added.
Do not "round up."

- **M0 -> M1** requires explicit contracts/schemas/policy definitions.
- **M1 -> M3/M4/M5** requires a real adapter/runtime path or a truthful preflight implementation.
- **M4/M5 -> M6** requires read-only verification and operator-facing review evidence.
- **M6 -> M7** requires rollback, reverse, or restore that is actually tested.
- **M7 -> M8** requires stable ergonomics, docs alignment, and confidence that widening the surface will not break the truth model.

If a capability regresses, downgrade it.
Truth is more important than roadmap neatness.

---

## 5. Truth hierarchy and baseline routine

Every Codex session that intends to change the repo must begin by
re-establishing the current capability truth.
This is what makes the charter evergreen.

### 5.1 Truth hierarchy

Use this order:

1. **runtime behavior on the actual admitted path**
2. **targeted tests covering that path**
3. **implementation code in adapters/runtime/planners/policy**
4. **repo docs and README text**
5. **external O3DE docs/research notes** for risk judgment and domain constraints

### 5.2 Baseline verification routine

Before choosing the next packet:

1. Inspect the likely truth files for the target domain.
2. Re-run the narrowest relevant targeted tests.
3. If a live target exists, run the smallest real runtime proof.
4. Reclassify the affected capabilities on the maturity ladder.
5. Choose the next packet by removing the highest-leverage missing gate on the critical path.

### 5.3 Default evidence areas to inspect

When verifying current state, start here:

- `backend/app/services/adapters.py`
- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/policy.py`
- `backend/app/services/dispatcher.py`
- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/planners/`
- `backend/runtime/editor_scripts/`
- `backend/tests/test_dispatcher.py`
- `backend/tests/test_prompt_control.py`
- `backend/tests/test_editor_automation_runtime.py`
- related API/operator/catalog/model files for the targeted slice

### 5.4 Required per-packet status footer

To avoid rewriting this roadmap, every Codex packet output must end with a short
status footer:

- **Capabilities moved:** old level -> new level
- **Evidence:** tests run, runtime proof, artifacts
- **Scope added:** exact surfaces widened, if any
- **Still blocked by:** next missing gate
- **Recommended next packet:** single best next move
- **Revert path:** how to undo the packet itself

That footer is the living progress record.
This charter stays stable.

---

## 6. Default priority algorithm

When choosing what to build next, follow this decision order.

### Priority rule 1 - finish Stage 1 before broadening other domains

If Stage 1 is not complete, work only on the narrow editor-authoring foundation
until it becomes dependable and reviewable.

Default order inside Stage 1:

1. **Prompt chaining across existing real editor steps**
2. **Read-only discovery and readback for what was changed**
3. **Operator-facing review summaries / evidence**
4. **Only then carefully widen authoring breadth**

### Priority rule 2 - harden the narrow config lane before real build/test execution

If Stage 1 is complete but Stage 2 is not:

1. strengthen `project.inspect`
2. strengthen admitted `settings.patch`
3. strengthen `build.configure` preflight truthfulness
4. keep real compile/test execution out of scope

### Priority rule 3 - reversibility before autonomy

If Stage 2 is complete but Stage 3 is not:

1. add review and rollback to every exposed mutation path
2. add editor/content snapshot or reverse-op semantics
3. add dependable validation/build feedback as evidence/reporting first
4. do not widen destructive or hard-to-reverse operations before rollback exists

### Priority rule 4 - add breadth only after gates exist

Only after Stages 1-3 are strong should Codex widen into:

- asset inspection, then asset mutation
- render/material inspection, then render/material mutation
- build/test execution
- broader automation surfaces
- export/shipping workflows

### Priority rule 5 - prefer the next missing gate, not the next flashy feature

For any targeted capability, the next correct work item is usually the **next
missing gate**:

- result binding
- planner integration
- runtime adapter
- review/readback
- rollback
- docs alignment

Not a broader capability.

---

## 7. Domain playbooks

These are the stable domain-specific rules Codex should follow.

### 7.1 Editor authoring lane

**This is the first operational lane.**

Treat these as the likely first-class surfaces to harden and extend, one gate at
a time:

- session open / attach
- level open
- entity create
- allowlisted component add
- component property read
- read-only entity/component discovery
- post-mutation review

**Likely repo areas:**

- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/adapters.py`
- `backend/app/services/planners/editor_planner.py`
- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/dispatcher.py`
- `backend/runtime/editor_scripts/`
- `backend/tests/test_prompt_control.py`
- `backend/tests/test_dispatcher.py`
- `backend/tests/test_editor_automation_runtime.py`

**Required rules:**

- keep authoring surfaces narrow and explicit
- prefer allowlists over open-ended component/property mutation
- add read-only discovery before widening writes
- require a loaded level and healthy editor target where appropriate
- make prompt flows consume earlier step outputs rather than forcing the user to paste IDs

**Do not automate yet unless explicitly proven safe:**

- arbitrary component names
- arbitrary property writes
- parenting and hierarchy rewrites
- transform mutation at scale
- prefab instantiation / replacement
- deletes and destructive bulk edits
- arbitrary Editor Python execution

### 7.2 Review and evidence lane

A write path without a review path is not operationally trustworthy.

Codex should prefer these review surfaces before broadening writes:

- entity find / lookup
- component enumeration
- property readback
- artifactized summary of what changed
- explicit "verified vs assumed" reporting

**Likely repo areas:**

- `backend/app/services/summary.py`
- `backend/app/services/prompt_orchestrator.py`
- `backend/app/services/editor_automation_runtime.py`
- `backend/app/services/adapters.py`
- execution/event/artifact models
- tests for prompt control, dispatcher, and editor runtime

### 7.3 Project / build / configuration lane

This is the second operational lane.

Start from:

- project/config inspection
- narrow admitted config mutation
- configure/build planning and prerequisite diagnostics

**Likely repo areas:**

- `backend/app/services/adapters.py`
- `backend/app/services/planners/project_build_planner.py`
- `backend/app/services/capability_registry.py`
- `backend/app/services/policy.py`
- `backend/tests/test_dispatcher.py`

**Required rules:**

- config mutation must remain narrow, admitted, backed up, verified, and reversible
- configure/build planning must remain truthful when execution is not yet admitted-real
- config changes that affect editor assumptions must trigger explicit refresh/reopen guidance

**Do not automate yet unless explicitly proven safe:**

- real build compile
- broad Settings Registry mutation outside admitted safe scope
- Gem enable/disable as a casual prompt action
- project creation as a real default prompt path
- export/shipping workflows

### 7.4 Validation / testing lane

Validation is valuable early, but real execution should arrive later than
evidence plumbing.

Codex should prefer:

- validation preflight
- artifact/report ingestion
- structured run summaries
- explicit next-step guidance

before claiming:

- real test execution
- sharded automation
- TIAF orchestration as a standard prompt flow

**Likely repo areas:**

- `backend/app/services/planners/validation_planner.py`
- `backend/app/services/summary.py`
- execution/artifact models
- validation-related policy/catalog/schema files
- tests around prompt/control surfaces

**Required rules:**

- no fake "tests ran" or "build succeeded" statements
- result semantics must be backed by artifacts and return codes
- failure modes must be explicit

### 7.5 Asset / prefab / content pipeline lane

Treat this lane as **high risk** until proven otherwise.

Start with:

- read-only asset inspection
- identity/reference inspection
- product/source lookup visibility
- safe reporting of path-vs-UUID risk

Only later consider mutation.

**Likely repo areas:**

- asset/pipeline planner and catalog files
- policy/capability registry entries for asset operations
- any future asset runtime adapters
- tests for asset tool contracts

**Do not automate yet unless explicitly proven safe:**

- bulk asset relocation
- path-to-UUID migration
- prefab nesting rewrites
- material assignment by prompt as a real mutation surface
- scene import mutation with implicit dependency assumptions

### 7.6 Rendering / material / shader lane

Treat this as **high risk and late-phase**.

Start with:

- read-only inspection
- validation/reporting
- material/render evidence collection

Do not expose broad mutation until shader/material lifecycle rules are validated.

**Do not automate yet unless explicitly proven safe:**

- shader edits via prompt
- material graph/property mutation as a broad surface
- pipeline/pass rewiring
- visual-test conclusions without stable tolerance and evidence rules

### 7.7 Rollback / reversibility lane

Config rollback can arrive early.
Editor/content rollback must not be hand-waved.

**Rules:**

- if config writes are admitted-real, they must have backup + verify + rollback
- if editor/content writes are exposed, they must not be advertised as undoable until reverse or snapshot restore exists
- irreversible or weakly reversible operations must remain tightly gated

### 7.8 Planner / policy / approval lane

The planner is an intent compiler, not a loophole.

**Rules:**

- keep prompt compilation typed and bounded
- refuse arbitrary tool execution
- require approvals on all meaningful writes and protected-scope actions
- keep dry-run / preflight mandatory where mutation is not yet admitted-real
- keep policy labels honest

---

## 8. Capability promotion gates

Use this checklist before promoting any capability.

| Gate | Question | Required for promotion to |
|---|---|---|
| **G1** | Is there a typed schema/contract for the capability? | M1+ |
| **G2** | Is there a real adapter/runtime path or truthful preflight path? | M3/M4/M5 |
| **G3** | Are there targeted tests for the path? | M4/M5+ |
| **G4** | Does the planner/prompt layer expose it honestly and narrowly? | promptable use |
| **G5** | Is policy/approval behavior explicit and correct? | any write path |
| **G6** | Can the system read back and verify what happened? | M6+ |
| **G7** | Can it roll back, reverse, or restore truthfully? | M7+ |
| **G8** | Are operator-facing summaries and docs aligned with reality? | M8 |

### Promotion law

- Missing G2 means the capability is not real.
- Missing G6 means it is not reviewable.
- Missing G7 means it is not reversible.
- Missing G8 means it is not ready to widen.

---

## 9. Forbidden shortcuts

Codex must not take these shortcuts to look productive:

- claiming simulated behavior is real
- presenting plan-only behavior as mutation success
- widening a component/property surface without per-surface proof
- using asset/material mutation as a "quick demo win"
- claiming generalized undo without real reverse/restore semantics
- routing around approvals to make a demo easier
- treating stale docs as repo truth
- mixing multiple risky domains into one work packet

If a packet needs three or more major risk domains at once, it is too large.

---

## 10. Work packet template

Every Codex packet should be small enough to build, verify, and judge
immediately.

Use this template.

### Packet title

Single capability or gate only.

### Goal

What exact maturity increase is intended?

### Capability targeted

Name the capability and current maturity level.

### Likely files/modules touched

List the narrowest likely set.

### Exact deliverable

Be concrete and testable.

### Why this is the next correct move

Reference the missing gate it removes on the critical path.

### Verification steps

Include:

- targeted tests
- live runtime proof if relevant and available
- artifact/evidence to inspect

### Rollback / revert plan

How to back out the packet itself.

### Safe for Codex now?

Yes/no.

### Needs human approval?

Yes/no and why.

### Required footer after completion

- capability delta
- evidence
- risks remaining
- best next packet

---

## 11. Default packet order

This is the evergreen default order Codex should follow **unless the baseline
routine proves some steps are already complete**.

1. **If prompt chaining across existing real editor steps is missing, build that first.**
   - especially result binding from entity creation into later component-add steps

2. **If editor write review is weak, add read-only discovery next.**
   - entity lookup
   - component enumeration
   - promptable property reads

3. **If post-mutation evidence is weak, add operator-facing review artifacts.**

4. **If the narrow config lane is not operator-grade, harden it next.**
   - admitted `settings.patch` summaries
   - backup/verify/rollback output
   - `build.configure` prerequisite clarity

5. **If editor/content writes are still not reversible, add snapshot or reverse semantics before broadening authoring.**

6. **Add validation/build feedback as report/preflight ingestion before real execution.**

7. **Only after the above, widen safe scene-authoring breadth carefully.**
   - one new component or one new explicit operation at a time

8. **Only after earlier gates exist, add read-only asset/material inspection.**

9. **Only after asset/material inspection is dependable, consider asset/material mutation.**

10. **Only after validation, evidence, and rollback are mature, consider real build/test execution.**

11. **Only after all of the above should project creation, export, and broader media workflows become priority work.**

This order remains valid even as the exact status changes, because it is conditional.

---

## 12. Stage-specific "do this, not that" guidance

### Stage 1 focus

Do this:

- one-prompt editor chain
- ID/result binding
- review/readback
- narrow component allowlist
- truthful evidence

Not this:

- asset mutation
- build execution
- render/material mutation
- broad destructive editor operations

### Stage 2 focus

Do this:

- `project.inspect`
- narrow admitted `settings.patch`
- `build.configure` preflight
- config rollback
- cross-lane refresh rules

Not this:

- compile/build execution
- Gem enable/disable as casual prompt mutation
- project creation as a default path

### Stage 3 focus

Do this:

- editor/content rollback model
- validation/build evidence and reports
- post-action review everywhere

Not this:

- generalized autonomy without reversibility
- broad destructive content mutation

### Stage 4 focus

Do this:

- narrow admitted-real expansion into asset/render/validation/export lanes
- one surface at a time with the same gates

Not this:

- wide open multi-domain control just because the architecture exists

---

## 13. Operator contract for natural-language control

The shortest safe path from today's repo state to the desired workflow is this
stable control pattern:

1. **User gives a prompt.**
2. **System interprets intent using only typed, admitted surfaces.**
3. **Planner selects allowed operation(s), not arbitrary commands.**
4. **System executes only admitted-safe actions.**
5. **System captures artifacts, events, outputs, and proofs.**
6. **System presents review that distinguishes verified facts from assumptions.**
7. **User can accept, refine, or undo - but only where undo is actually real.**

### What should be promptable first

Promptable first:

- narrow editor session/level/entity/component flows
- read-only editor review/readback
- project/config inspection
- admitted narrow config mutation
- configure/build preflight
- validation/build reporting and evidence intake

### What should stay out of scope for now

- arbitrary Editor command/script execution
- broad content mutation
- asset/material mutation
- broad registry mutation
- real compile/test execution without a proven substrate
- generalized undo claims

### Where approvals are required

Require approvals for:

- editor writes
- config mutation
- shared environment mutation
- any future build/export execution
- any future high-risk asset/material/render mutation

### Where dry-run/preflight remains mandatory

Keep dry-run/preflight mandatory for:

- configure/build actions until real execution is admitted
- any config mutation outside the narrow admitted path
- any future asset/material/render mutation until review and rollback are proven

### How rollback should work for config mutation

Config mutation is only operationally acceptable when it follows this pattern:

1. compute the narrow admitted patch
2. back up the affected source of truth
3. write only within admitted scope
4. verify by re-reading
5. roll back on any failed postcondition

### What is still needed for editor/content rollback

Before claiming real undo for editor/content mutation, one of these must exist:

- explicit reverse tools
- pre-mutation snapshots and restore
- bounded restore points with proof

Until then, editor/content mutation may be real but **not undoable**.

### How to stop invalid or destructive operations before they happen

Use all of these together:

- typed planner boundaries
- schema validation
- capability registry truth
- policy/admission stages
- approvals and locks
- runtime preflight checks
- narrow allowlists
- review-before-breadth discipline

---

## 14. Hard truths that should remain true guidance even as the repo evolves

These are not temporary notes. They are durable warnings.

- The easiest way to ruin this project is to confuse planner/catalog breadth with admitted-real execution.
- The first real success path is editor authoring plus review, not full platform breadth.
- The config lane can become dependable earlier than build execution.
- Asset/prefab/material mutation is structurally riskier than it looks.
- Rendering automation is not "just change some files"; it is pipeline/toolchain behavior.
- Validation/build execution is not honest until backed by real runtimes, artifacts, and failure semantics.
- Generalized undo is a real engineering feature, not a UI label.
- O3DE docs are useful for risk framing but incomplete in places; source and tests remain necessary.

This section should stay blunt.
It is part of the safety model.

---

## 15. Seed baseline appendix (historical starting point only)

This appendix captures the initial bundle-baseline assessment that this charter
was built from.
It is **not** the living status record.
Treat it as the historical seed and a sanity check against accidental
backsliding.

### Seed baseline - admitted-real or near-real at start

- `editor.session.open`
- `editor.level.open`
- `editor.entity.create`
- `editor.component.add`
- `editor.component.property.get`
- `project.inspect`

### Seed baseline - constrained/gated at start

- `build.configure` as real dry-run / plan-only preflight
- `settings.patch` as narrow admitted mutation with backup / verification / rollback semantics

### Seed baseline - still incomplete or not admitted-real at start

- prompt-driven project creation
- dependable asset/material mutation
- dependable real build/test execution
- generalized content review + undo across arbitrary editor/content mutations
- full multi-domain admitted-real orchestration across editor + assets + rendering + validation

If current code no longer matches this appendix, that is expected over time.
Record the new truth in the packet footer, not by rewriting the charter.

---

## 16. Operator-ready execution sequence

Use this sequence every time Codex is asked to push the project forward.

1. **Re-baseline the targeted capability from code/tests/runtime.**
2. **Classify it on the maturity ladder.**
3. **Identify the next missing gate on the critical path.**
4. **Create one small work packet that removes only that gate.**
5. **Implement narrowly.**
6. **Run targeted verification.**
7. **Capture evidence and state the exact capability delta.**
8. **Do not widen scope in the same packet unless the missing gate itself requires it.**
9. **If verification fails, revert and reduce scope.**
10. **Only move to the next domain after the current stage exit condition is satisfied.**

### The default first move from the original bundle baseline

If the repo is still missing smooth chaining across the existing real editor
path, the first move is:

- add step-result binding and one-prompt planning for the existing editor chain

If that is already done, the next move is:

- add read-only entity/component discovery and post-mutation review

If that is already done, the next move is:

- harden the narrow config lane and then add rollback/review depth before broadening into new domains

That logic remains valid without needing this document to be rewritten.

---

## 17. Final rule

When in doubt, do **less** but make it **truer**.

A smaller admitted-real, reviewable, reversible capability is worth more than a
broad simulated platform.
