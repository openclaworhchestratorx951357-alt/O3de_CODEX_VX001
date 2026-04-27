# Phase 9 Asset Readback Live Proof

## Purpose

This packet records the live proof for the proof-only `asset.source.inspect`
product/dependency readback path.

## Proof Command

The proof invoked the backend dispatcher with:

- `O3DE_ADAPTER_MODE=hybrid`
- project root: `C:\Users\topgu\O3DE\Projects\McpSandbox`
- source: `Levels/BridgeLevel01/BridgeLevel01.prefab`
- `include_products: true`
- `include_dependencies: true`
- a temporary control-plane database outside the repo

No Asset Processor, `AssetProcessorBatch`, source-asset mutation, cache mutation,
or project-file mutation command was run.

## Live Evidence

Result:

- `ok: true`
- `execution_mode: real`
- `simulated: false`
- artifact kind: `asset_inspection_result`
- artifact URI:
  `file:///C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/BridgeLevel01/BridgeLevel01.prefab`
- source exists: `true`
- source is file: `true`
- source size: `23738`
- source SHA-256:
  `bf92fd917fa1868cb3ed53e65b60d1370830ad5252eaea3c635dd7ca54ee4ce3`

Inspection evidence:

- `source_path_identity`
- `source_resolution_status`
- `source_file_stat`
- `source_file_hash`
- `assetdb.sqlite_source_mapping`
- `assetdb.sqlite_product_rows`
- `assetdb.sqlite_dependency_rows`

Unavailable evidence:

- none

Product evidence:

- available: `true`
- source: `assetdb.sqlite-read-only`
- count: `1`
- product:
  `pc/levels/bridgelevel01/bridgelevel01.spawnable (product_id=10608, sub_id=-575275456, platform=pc, job_key=Prefabs, job_status=4, hash=-7827569063961660435, last_log_time=1776972479705, source_guid=439941DB330C530FAD3E5A36C19A1519)`

Dependency evidence:

- available: `true`
- source: `assetdb.sqlite-read-only`
- count: `5`
- dependency source GUIDs:
  - `215E47FDD1815832B1AB91673ABF6399`
  - `0CD745C06AA8569AA68A73A3270986C4`
  - `3FD09945D0F255C8B9AFB2FD421FE3BE`
  - `3FD09945D0F255C8B9AFB2FD421FE3BE`
  - `FD340C30755C591192A319A3F7A77931`

Warnings:

- control-plane bookkeeping was real
- the run used the first real read-only `asset.source.inspect` path

## Boundary

This proof admits only the bounded read-only evidence path already implemented
behind `asset.source.inspect`.

Still unadmitted:

- public product/dependency completeness claims
- Asset Processor execution
- `AssetProcessorBatch` execution
- cache mutation
- source/product asset mutation
- `asset.product.resolve`
- broader asset catalog queries

## Next Safe Packet

The next safe packet is an operator-facing prompt/examples update for this exact
read-only asset source/product/dependency readback corridor, including safe and
refused requests.
