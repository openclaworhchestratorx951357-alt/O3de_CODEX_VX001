# O3DE AI Asset Forge Operator Review Packet

## Purpose

Define the operator-facing review packet required before an O3DE AI Asset Forge
generated asset can move from proof-only processing toward any assignment or
placement design.

This is a contract packet only. It does not implement a UI, backend store,
entity assignment, level placement, import admission, or production-use
approval.

## Why This Gate Exists

The first generated Forge asset has now passed the bounded proof chain:

1. local TripoSR generation outside O3DE
2. cleanup/conversion outside O3DE
3. proof-only source staging into `McpSandbox`
4. Asset Processor processing
5. read-only Phase 9 source/product/dependency/catalog validation

That makes the asset an O3DE-processed candidate. It does not make the asset
approved, production-safe, placeable, or commercially usable.

The operator review packet is the human-readable gate between proof evidence
and any future mutation corridor.

## Review Packet Inputs

A review packet must be built from read-only evidence and recorded provenance:

- generated asset slug
- selected O3DE project
- selected platform
- project-relative source asset path
- project-relative provenance metadata path
- source asset hash
- generation backend and model
- generation prompt or reference input
- cleanup/conversion evidence
- Asset Processor job result
- Asset Database source row
- Asset Database product rows
- Asset Database product-dependency rows
- Asset Catalog product-path presence
- product cache presence
- warnings and errors
- license and commercial-use status
- operator approval state

## Required Top-Level Fields

Every generated-asset review packet must include:

```text
review_packet_version
asset_slug
project_root
project_name
selected_platform
source_asset_path
provenance_metadata_path
source_asset_sha256
read_only
mutation_occurred
review_status
blocked_reason
operator_decision
next_safest_step
```

Required invariants:

```text
read_only: true
mutation_occurred: false
```

The review packet may summarize evidence. It must not commit raw cache files,
model weights, generated assets, or runtime proof artifacts to this repository.

## Provenance Section

The packet must show:

```text
generation_backend
generation_backend_repository
generation_backend_commit
model_name
model_source
input_prompt
input_image_or_reference
seed
generation_settings
generation_timestamp
generation_output_path
generation_output_sha256
cleanup_tool
cleanup_settings
cleanup_output_path
cleanup_output_sha256
license_name
license_url
commercial_use_allowed
intended_use
```

If any license or commercial-use value is unknown, the review packet must not
allow production approval.

## O3DE Source Section

The packet must show:

```text
project_root
project_json_path
project_name
source_asset_path
source_asset_absolute_path
source_asset_sha256
provenance_metadata_path
provenance_metadata_sha256
staging_policy
staging_approval_source
```

The source path must remain inside the selected project root.

## Asset Processor Section

The packet must show:

```text
asset_processor_invoked
asset_processor_tool_path
asset_processor_project_root
asset_processor_platform
asset_processor_completed
asset_processor_errors
asset_processor_warnings
asset_processor_log_path
asset_processor_log_summary
```

Warnings must be visible to the operator. They must not be buried in raw logs.

For the first proof target, the warning summary is:

- source watch folder was not reported for the generated source GUID
- mesh node name `mesh.obj` was normalized to `mesh_obj`
- empty material node name was normalized to `Material`
- tangents could not be generated because the mesh has no UV coordinates

## Phase 9 Readback Section

The packet must show:

```text
asset_database_path
asset_catalog_path
source_id
source_guid
job_id
job_key
job_status
job_error_count
job_warning_count
product_count
dependency_count
catalog_presence
representative_products
representative_dependencies
```

For the first proof target, the packet should summarize:

```text
SourceID: 3216
SourceGuid: {A7FF11AC-5803-54B6-A918-A8AF225DAA3A}
JobKey: Scene compilation
ErrorCount: 0
WarningCount: 4
product_count: 15
dependency_count: 21
catalog_presence: true
```

## Quality Review Section

The packet must reserve fields for operator quality judgement:

```text
scale_review
pivot_review
orientation_review
material_review
texture_review
mesh_quality_review
collision_readiness
lod_readiness
performance_notes
visual_review_artifact
operator_notes
```

For the current TripoSR chair proof, the review packet must highlight that the
mesh has no UV coordinates and material/texture quality is not production
validated.

## Review Status Values

Allowed review statuses:

```text
missing_provenance
missing_source_asset
asset_processor_not_run
asset_processor_failed
asset_processor_warnings_need_review
asset_database_missing
source_not_found
product_not_found
dependency_rows_missing
catalog_presence_missing
license_review_required
quality_review_required
ready_for_operator_decision
operator_rejected
operator_requested_regeneration
operator_requested_cleanup
operator_approved_internal_prototype
operator_approved_assignment_design
```

`operator_approved_assignment_design` does not assign or place the asset. It
only permits a later design packet for an exact assignment corridor.

## Operator Decisions

Allowed operator decisions:

```text
pending
reject
request_regeneration
request_cleanup
request_license_review
approve_internal_prototype
approve_assignment_design_only
```

Forbidden decisions in this packet:

```text
approve_public_import_corridor
approve_entity_assignment
approve_level_placement
approve_production_use
```

Those require later design, proof, admission, and rollback/restore discipline.

## Blocked Review Rules

A review packet must block if:

- provenance metadata is missing
- source asset hash is missing
- Asset Processor has not run
- Asset Processor failed
- Asset Database source row is missing
- product rows are missing
- catalog presence is missing
- license/commercial-use status is unknown for production use
- warnings require operator acknowledgement
- quality review is missing

Blocked packets must still report the safest next step.

## First Proof Target Mapping

Current bounded proof target:

```text
asset_slug: triposr_chair_001
project: McpSandbox
platform: pc
source: Assets/Generated/triposr_chair_001/triposr_chair_001.glb
provenance: Assets/Generated/triposr_chair_001/triposr_chair_001.forge.json
```

Current evidence docs:

- `docs/AI-ASSET-FORGE-LOCAL-GENERATION-PROOF.md`
- `docs/AI-ASSET-FORGE-CLEANUP-CONVERSION-PROOF.md`
- `docs/AI-ASSET-FORGE-O3DE-SOURCE-STAGING-PROOF.md`
- `docs/AI-ASSET-FORGE-ASSET-PROCESSOR-VALIDATION.md`

## Boundaries Preserved

- no generated asset assignment
- no level placement
- no public import admission
- no production-use approval
- no broad Asset Processor corridor
- no Cache files in git
- no generated assets in git
- no model weights in git
- no entity/prefab/level mutation

## Next Required Forge Packet

```text
Branch:
codex/ai-asset-forge-operator-review-packet-implementation

PR title:
Implement AI Asset Forge generated asset review packet
```

Purpose:

Create the first structured review-packet output for the bounded
`triposr_chair_001` proof target using existing provenance, Asset Processor,
Phase 9 readback, and catalog evidence. Keep assignment, placement, and
production admission blocked.

## Final Rule

No generated asset may move toward assignment or placement until an operator
review packet exposes provenance, product/dependency/catalog evidence, warnings,
license/commercial status, quality notes, and an explicit operator decision.
