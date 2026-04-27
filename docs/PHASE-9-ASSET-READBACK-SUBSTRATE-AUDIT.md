# Phase 9 Asset Readback Substrate Audit

Status: normalized phase substrate audit packet

Date: 2026-04-27

## Current Main SHA

This audit was prepared from:

```text
9d4119a74b1f2fc3f18edfde17a8baf63e632d53
```

## Phase Workflow Stage

Substrate audit packet.

Earlier Phase 9 packets blocked product/dependency readback because no exact
read-only project/cache substrate had been identified. This packet resolves
that blocker by auditing a concrete local `McpSandbox` cache substrate without
running Asset Processor, mutating source assets, mutating product cache files,
changing schemas, or admitting a public product/dependency readback surface.

## Audit Decision

Phase 9 is no longer blocked at the "no substrate exists" gate for the local
`McpSandbox` target.

This is a local proof target, not a production-general assumption. Production
generalization is tracked separately in
`docs/PHASE-9-PRODUCTION-GENERALIZATION-PLAN.md`; future packets must discover
the user project root, `project.json`, cache directory, `assetdb.sqlite`,
platform cache folders, `assetcatalog.xml`, and requested source path
dynamically before describing the adapter as production-general.

The following read-only substrate is sufficient to start a narrow proof-only
reader packet:

```text
Project root: C:\Users\topgu\O3DE\Projects\McpSandbox
Cache root:   C:\Users\topgu\O3DE\Projects\McpSandbox\Cache
Product/dependency index:
  C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite
Supplemental catalog:
  C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\pc\assetcatalog.xml
```

`assetdb.sqlite` is the primary proof substrate because it exposes explicit
tables for source records, jobs, products, source dependencies, product
dependencies, scan folders, and freshness-oriented job/stat metadata.

## Read-Only Evidence

The audit opened the SQLite database in read-only mode:

```text
file:C:/Users/topgu/O3DE/Projects/McpSandbox/Cache/assetdb.sqlite?mode=ro
```

No Asset Processor command was run. No source, cache, product, prefab, or
database file was edited or copied into the repository.

Observed database facts:

| Evidence | Value |
| --- | --- |
| Database path | `C:\Users\topgu\O3DE\Projects\McpSandbox\Cache\assetdb.sqlite` |
| Database size | `11771904` bytes |
| Database modified time | `2026-04-27T03:08:26.512149+00:00` |
| Database SHA-256 prefix | `473b1c357881d860` |
| `Sources` rows | `3214` |
| `Products` rows | `10608` |
| `ProductDependencies` rows | `2323` |
| `SourceDependency` rows | `16425` |
| `Jobs` rows | `3350` |
| `ScanFolders` rows | `129` |

Observed relevant tables:

- `ScanFolders`: maps scan-folder ids to absolute roots and portable keys.
- `Sources`: maps source ids to scan folders, source names, source GUIDs, and
  analysis fingerprints.
- `Jobs`: maps source ids to builder job records, platform, status, job key,
  fingerprints, and log timestamps.
- `Products`: maps job ids to product names, product sub ids, hashes, flags,
  and asset type bytes.
- `ProductDependencies`: maps product ids to dependency source GUIDs,
  dependency sub ids, platform, flags, unresolved paths, and `FromAssetId`.
- `SourceDependency`: maps source GUIDs to source-dependency paths and types.

## Exact Sample

The narrow audit sample is the known project-local level prefab:

```text
source_path: Levels/BridgeLevel01/BridgeLevel01.prefab
source root: C:\Users\topgu\O3DE\Projects\McpSandbox
scan folder: Project/Assets
source id: 3214
source guid: 439941DB330C530FAD3E5A36C19A1519
```

The database maps that source to one product:

```text
product id: 10608
product name: pc/levels/bridgelevel01/bridgelevel01.spawnable
sub id: -575275456
platform: pc
job key: Prefabs
job status: 4
last log time: 1776972479705
```

The product has five product-dependency rows:

| Dependency source GUID | Dependency sub id | Flags | From asset id |
| --- | ---: | ---: | ---: |
| `215E47FDD1815832B1AB91673ABF6399` | `1000` | `1` | `1` |
| `0CD745C06AA8569AA68A73A3270986C4` | `277889906` | `1` | `1` |
| `3FD09945D0F255C8B9AFB2FD421FE3BE` | `2000` | `1` | `1` |
| `3FD09945D0F255C8B9AFB2FD421FE3BE` | `3000` | `1` | `1` |
| `FD340C30755C591192A319A3F7A77931` | `281415304` | `1` | `1` |

This gives the next packet a bounded source-to-product and
source-to-product-dependency proof target without needing broad project scans,
Asset Processor execution, prefab graph interpretation, or product cache
mutation.

## Freshness Model

The first proof-only reader should report freshness conservatively.

Known freshness evidence:

- database file modified time
- database SHA-256 prefix or full hash computed at read time
- `Jobs.LastLogTime` for the source job
- `Jobs.Fingerprint`
- `Sources.AnalysisFingerprint`
- `Products.Hash`

Unknown or not yet admitted:

- whether `Jobs.LastLogTime` alone proves product cache freshness
- whether the WAL/SHM companions must be included in freshness reporting
- whether `assetcatalog.xml` should be read in addition to `assetdb.sqlite`
- how to translate dependency GUIDs back into operator-facing source/product
  names without additional joins or catalog parsing

Therefore the proof-only packet may report product and dependency evidence as
available only with explicit provenance and bounded counts, but it must not
claim complete project dependency truth.

## Required Proof-Only Packet

The next Phase 9 packet may be:

```text
codex/phase-9-asset-readback-proof-only
```

That packet may add a narrow read-only database reader behind
`asset.source.inspect` only if it preserves these boundaries:

- require an explicit `source_path`
- resolve the source inside `project_root`
- require an explicit admitted cache/index path or a project-local cache path
  derived from the audited `McpSandbox` root
- open SQLite with read-only URI mode
- bound returned product and dependency entry counts
- preserve unavailable behavior for missing, unreadable, unsupported, stale, or
  source-not-indexed cases
- preserve existing source-only behavior when product/dependency flags are not
  requested
- keep public capability status read-only and non-mutating
- never run Asset Processor or AssetProcessorBatch
- never mutate source files, products, cache files, prefabs, or references

## Implementation Touchpoints For Next Packet

Expected narrow code touchpoints:

- `backend/app/services/adapters.py`
- `backend/tests/test_dispatcher.py`
- `backend/tests/test_prompt_control.py`

Schema changes should be avoided for the first proof-only reader if existing
string-array fields can carry bounded entries. If structured evidence is needed,
that should be a separate schema packet.

## Still Blocked

This audit does not admit:

- public product/dependency completeness claims
- production-general project discovery
- prefab/reference graph readback
- product cache mutation
- Asset Processor execution
- asset move, rename, delete, reprocess, or reference repair
- material, render, shader, build, TIAF, or Editor Python expansion
- broad external cache probing
- generic `asset.product.resolve`

## Validation Commands For This Packet

This packet is docs-only and should be validated with:

```powershell
git diff --check
git diff --cached --check
```

The read-only substrate audit used Python standard-library SQLite in read-only
URI mode. No dependency install was required.

## Revert Path

Revert the commit that adds this audit and its index/status pointers. No source
asset, product cache, runtime proof artifact, dependency, or schema cleanup is
required.
