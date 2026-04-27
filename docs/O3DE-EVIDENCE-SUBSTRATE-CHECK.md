# O3DE Evidence Substrate Check

## Purpose

Codex must not declare an O3DE capability blocked until it checks whether O3DE
already stores the needed information in a read-only evidence substrate.

This rule exists because Phase 9 asset readback was unblocked by inspecting the
project Asset Processor database:

```text
C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite
```

The lesson:
A missing public API or prompt surface does not always mean the information is
unavailable. It may already exist in an O3DE cache, database, catalog,
registry, generated artifact, build output, or proof artifact.

## Mandatory Blocked-Status Rule

Before saying blocked, Codex must answer:

1. Does O3DE already store this information in a cache/database/catalog?
2. Is there a read-only proof path?
3. Can we inspect it without mutating the project?
4. Can we prove one bounded example?
5. If yes, proceed to proof-only readback instead of declaring blocked.

If any answer is unknown, Codex must investigate before declaring blocked.

## Common O3DE Evidence Substrates

Codex should consider these read-only substrates before declaring blocked:

### Asset Pipeline / Asset Processor

Examples:

- project `Cache/assetdb.sqlite`
- Asset Database tables:
  - Sources
  - Jobs
  - Product
  - ProductDependencies
  - SourceDependency
  - ScanFolders
- Asset Cache product files
- Asset Catalog files
- product dependency records
- source-to-product mappings

Rules:

- inspect read-only only
- do not commit `assetdb.sqlite`
- do not commit `Cache/`
- do not mutate product assets
- do not run Asset Processor unless explicitly approved
- do not run AssetProcessorBatch unless explicitly approved

### Editor/runtime Proof Artifacts

Examples:

- ignored runtime proof JSON
- live proof summaries
- readback proof outputs
- bridge status outputs

Rules:

- proof artifacts may be read for evidence
- raw runtime proof JSON stays ignored unless a specific checkpoint policy says
  otherwise

### Build/config/generated Outputs

Examples:

- build metadata
- generated source maps
- CMake output
- project registry/config output
- known-good CI logs

Rules:

- inspect read-only first
- do not clean/delete/rebuild large outputs unless approved
- do not change toolchain versions

### Project Files And Registries

Examples:

- project manifest/config files
- level prefab files
- `.setreg` files
- asset metadata files
- Gem/project registry data

Rules:

- prefer read-only inspection
- do not mutate project files unless the capability has been designed, audited,
  proofed, and admitted

## Required Investigation Report

If Codex believes something is blocked, it must produce a blocked-status report
with:

- requested capability
- exact missing public surface or tool
- evidence substrates checked
- commands/queries used
- read-only proof attempt result
- why no bounded proof example is possible
- safest next step

A blocked report is invalid if it does not list at least one O3DE evidence
substrate that was checked.

## Proof-Only Readback Rule

If a read-only path exists, Codex should not stop at "blocked." It should
create a proof-only readback packet.

A proof-only readback packet must:

- use one bounded target
- inspect read-only
- produce structured evidence
- avoid public admission unless a later admission decision approves it
- keep mutation flags false
- keep raw cache/proof files uncommitted
- document what remains blocked

## Example From Phase 9

Capability:
Asset source/product/dependency readback.

Initially suspected blocker:
No admitted public asset readback surface.

Evidence substrate found:
`McpSandbox/Cache/assetdb.sqlite`.

Bounded proof target:
`Levels/BridgeLevel01/BridgeLevel01.prefab`.

Expected product:
`pc/levels/bridgelevel01/bridgelevel01.spawnable`.

Result:
Phase 9 became unblocked for a proof-only asset source inspect reader.

## Final Rule

Do not treat lack of a prompt/adapter/catalog surface as proof that the
capability is blocked.

First check whether O3DE already records the evidence somewhere safe to
inspect.

Do not describe a local proof target as production-general. A production-general
claim also requires dynamic project/source discovery and blocked/readiness
behavior for missing project roots, `project.json`, cache directories,
databases, catalogs, schemas, components, or property paths.
