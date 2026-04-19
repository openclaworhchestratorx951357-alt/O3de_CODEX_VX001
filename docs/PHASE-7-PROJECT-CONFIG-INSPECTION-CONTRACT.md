# Phase 7 Project Config Inspection Contract

## Purpose

This document defines the exact contract for the next manifest-adjacent real
precursor after the current Phase 7 checkpoint.

It is intentionally narrower than the broader settings/Gem checklist.

It does not implement a real adapter path by itself.

It exists to answer one bounded question truthfully:

> What should count as an accepted real project-config inspection slice before
> any broader layered settings discovery or mutation work is attempted?

Read this together with:
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PHASE-7-SETTINGS-GEM-INSPECTION-CHECKLIST.md`
- `docs/PHASE-7-SETTINGS-GEM-CANDIDATES.md`
- `backend/README.md`

## Contract boundary

This precursor must stay:
- file-read-only
- workspace-local
- manifest-adjacent
- fallback-safe
- explicitly non-mutating

That means the accepted real source of truth is still:
- `project_root/project.json`

This precursor must not widen into:
- layered settings registry resolution
- runtime discovery across multiple config surfaces
- patch planning
- Gem mutation
- settings mutation

## Accepted scope

The accepted real scope for the next precursor is:
- reading top-level project config fields from `project_root/project.json`
- reporting which manifest-backed config keys were inspected
- distinguishing requested project-config keys from matched and missing
  manifest-backed keys
- persisting enough evidence to distinguish real file-read-only inspection from
  simulated fallback

Examples of acceptable config signals:
- project identity fields
- version-like fields
- engine compatibility fields
- top-level manifest metadata already present in the project manifest

Examples of explicitly out-of-scope signals:
- merged settings state from multiple files
- override precedence across layered registries
- any inferred mutation preview
- any config write readiness claim

## Required input and path assumptions

Before a real project-config inspection run is accepted, all of these must be
true:

1. `project_root` is provided explicitly.
2. `project_root/project.json` exists.
3. `project_root/project.json` can be read as JSON without repair or mutation.
4. The read path stays within the declared workspace/project root boundary.

If any of those assumptions fail, the slice must:
- reject before real execution, or
- fall back to a clearly labeled simulated path

## Required truthful output

If a future real project-config inspection slice succeeds, it must make these
statements true:

- the run used `project_root/project.json` as the only real source of truth
- the run was read-only
- the run did not mutate project settings
- the run did not imply broader layered settings discovery

Minimum evidence should identify:
- manifest path used
- config keys returned for the current inspection
- manifest-backed config keys that were available to inspect
- manifest-backed project origin provenance that was available to inspect
- manifest-backed presentation metadata that was available to inspect
- manifest-backed engine compatibility values and dependency keys that were
  available to inspect
- requested config keys
- matched requested config keys
- missing requested config keys
- whether the path was real or simulated
- adapter family
- adapter mode
- adapter contract version
- execution boundary

## Required operator wording

Operator-facing wording should stay specific:

- say `real read-only project-config inspection` when the real path succeeds
- say `simulated fallback` when the real path is unavailable
- say `manifest-backed` when describing the accepted evidence source

Operator wording must not imply:
- broader settings support
- layered config discovery
- write readiness
- mutation approval readiness

## Minimum validation expectations

Before this precursor is considered accepted, a future implementation slice
should demonstrate:

1. Success against a real `project_root/project.json` file.
2. Truthful fallback when the manifest is missing.
3. Truthful fallback when the manifest is unreadable.
4. Persisted evidence that shows which manifest-backed config keys were
   inspected.
5. Operator-visible wording that distinguishes this precursor from both
   simulated inspection and mutation-gated work.

## Relationship to existing accepted paths

This contract should extend the already accepted `project.inspect` boundary.

It should not create a separate broad settings subsystem first.

The safest next truthful statement is:

> `project.inspect` can expose a slightly richer real project-config inspection
> contract from `project_root/project.json`, while layered settings discovery
> and all mutation surfaces remain gated.

## Exit condition for the next implementation slice

The next real precursor slice should stop once it can prove:

- one manifest-backed project-config inspection path is real
- the path remains file-read-only
- fallback behavior is explicit
- operator visibility is explicit
- no layered settings or mutation behavior was added
