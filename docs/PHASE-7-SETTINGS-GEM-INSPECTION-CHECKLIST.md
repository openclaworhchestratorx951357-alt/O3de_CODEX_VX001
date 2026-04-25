# Phase 7 Settings/Gem Inspection Checklist

## Purpose

This checklist defines the next safe read-oriented precursor after the current
Phase 7 checkpoint.

It is intentionally narrow.

It does not implement a real adapter path by itself.

It exists to answer one bounded question truthfully:

> What must be true before a settings or Gem inspection path can move ahead of
> mutation-gated `settings.patch` or `gem.enable` work?

Read this together with:
- `docs/PHASE-7-CHECKPOINT.md`
- `docs/PHASE-7-REAL-ADAPTER-GATE.md`
- `docs/PHASE-7-PROJECT-BUILD-CANDIDATES.md`
- `backend/README.md`

## Candidate precursor scope

This checklist applies to the next read-oriented precursor only.

Accepted candidate scope:
- settings inspection for project configuration state
- Gem state inspection for currently enabled or discoverable Gems

Out of scope for this checklist:
- `settings.patch`
- `gem.enable`
- `build.compile`
- any mutating configure/build path

## Why this is the next safe precursor

This precursor stays below mutation risk while still moving Phase 7 forward.

It would let the control plane prove:
- real inspection of configuration-adjacent state
- truthful operator evidence for project config and Gem status
- narrower preconditions for later mutation-gated work

It should not claim:
- real settings mutation
- real Gem enablement
- broader build execution

## Preconditions before implementation

Before any real settings/Gem inspection slice begins, the slice must define all
of the following:

### Inspection surface

- the exact files, registries, manifests, or project descriptors to inspect
- whether the slice reads one source of truth or multiple layered sources
- the order of precedence if multiple sources are read

### Workspace and path assumptions

- how the project root is discovered or provided
- what files must exist before real inspection is attempted
- how missing files are reported truthfully
- what path boundary keeps the slice read-only and workspace-local

### Runtime assumptions

- whether inspection can be done from plain file reads alone
- whether any O3DE-specific CLI or helper is required
- how missing runtime dependencies are detected and reported

### Safety assumptions

- no settings file mutation
- no Gem mutation
- no build/configure side effects
- no generated file writes as part of inspection

## Minimum truthful fallback behavior

If the real inspection path cannot run, the system must do one of these:
- reject the attempt before real execution, or
- fall back to a clearly labeled simulated inspection path

In either case, operator-facing messaging must distinguish:
- real settings/Gem inspection ran
- simulated inspection ran
- real inspection was unavailable

## Minimum persisted evidence expectations

If a real settings/Gem inspection slice is implemented later, it should
persist enough evidence to answer:
- what inspection surface was used
- whether the path was real or simulated
- what project path or config source was inspected
- what adapter family and contract version produced the result

Minimum evidence fields should include:
- `adapter_family`
- `adapter_mode`
- `adapter_contract_version`
- `execution_boundary`
- a marker that the path used settings or Gem inspection specifically
- a truthful source marker when settings evidence comes only from top-level
  `project.json` manifest fields
- enough requested-vs-matched-vs-missing detail that operators do not need to
  infer subset results manually

## Minimum operator visibility expectations

If this precursor becomes real later, operators should be able to see the
boundary in:
- dispatch response wording
- timeline events
- runs and run detail
- executions and artifacts
- catalog/policy capability labeling

The UI should not imply that:
- `settings.patch` is real
- `gem.enable` is real
- mutation has been validated

## Validation checklist for a future implementation slice

Before a real settings/Gem inspection slice is accepted, it should demonstrate:

1. A successful real inspection run against an actual project/config surface.
2. A truthful fallback or rejection when the expected source files are missing.
3. Persisted evidence that clearly marks the run as real vs simulated.
4. Operator-visible wording that distinguishes inspection from mutation.
5. Updated docs naming the exact real scope and the still-gated mutation scope.

## Standing Phase 7 rule

Until this checklist is implemented and validated:
- `settings.patch` remains mutation-gated
- `gem.enable` remains mutation-gated
- any settings/Gem work beyond the current accepted scope remains simulated or
  unimplemented

## Next safe statement

The next real precursor slice after the current checkpoint should only try to
make one statement true:

> project settings or Gem state can be inspected through a validated real
> read-oriented path, while settings mutation and Gem enablement remain
> explicitly mutation-gated.
