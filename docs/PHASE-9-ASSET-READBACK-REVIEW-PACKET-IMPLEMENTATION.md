# Phase 9 Asset Readback Review Packet Implementation

## Purpose

This packet carries the Phase 9 asset readback readiness/review contract into
the `asset.source.inspect` runtime output.

It remains read-only. It does not execute Asset Processor, run
`AssetProcessorBatch`, repair caches, mutate source or product assets, import
generated assets, assign assets to entities, or admit any public asset write
corridor.

## Implemented Output

The `asset.source.inspect` execution details and artifact metadata now include:

- `asset_database_freshness_status`
- `asset_catalog_freshness_status`
- `asset_processor_rerun_required`
- `safest_next_step`
- `operator_approval_state`
- `missing_substrate_guidance`
- `asset_readback_review_packet`

The nested `asset_readback_review_packet` includes:

- capability and review contract version
- readiness and proof status
- read-only and mutation flags
- selected project summary
- selected platform summary
- asset database summary
- source summary
- product summary
- dependency summary
- catalog summary
- warnings and blocked reason
- missing-substrate guidance
- safest next step
- operator approval state
- future O3DE AI Asset Forge handoff placeholders

## Freshness Boundary

Freshness is explicit and conservative.

The implementation reports existing database/catalog evidence as
`stale_or_unverified` unless a later packet proves stronger read-only freshness
checks. Missing paths report `missing`, and unavailable evidence reports
`unknown`.

This packet does not refresh assets or catalogs. If the safest next step is to
refresh the asset pipeline, that remains operator-managed outside this
read-only corridor.

## Operator Review Guidance

Blocked or incomplete states now carry `missing_substrate_guidance` and
`safest_next_step` values. Examples include:

- select or register an O3DE project
- choose a valid project root containing `project.json`
- refresh Asset Processor outside Codex automation, then retry readback
- choose an available platform cache
- provide a safe project-relative source asset path
- harden the schema/query before claiming support

Successful proof returns `safest_next_step: operator_review` and
`operator_approval_state: not_requested`.

## AI Asset Forge Relevance

O3DE AI Asset Forge can now depend on a concrete review packet shape for future
generated-asset validation handoff.

The Forge handoff fields are placeholders only. This packet does not implement
generation, provenance storage, import, staging, assignment, or placement.

Generated assets are still not admitted or considered usable until future
packets prove their source/product/dependency/catalog evidence through the
same read-only Phase 9 review path and obtain operator approval.

## Still Not Admitted

- production-general public asset readback
- complete asset graph resolution
- `asset.product.resolve`
- broad Asset Catalog queries
- Asset Processor execution
- `AssetProcessorBatch` execution
- cache repair or mutation
- source or product asset mutation
- generated asset import or staging
- generated asset assignment or placement
- public asset write corridors

## Validation

Validation run in this packet:

```text
PYTHONPATH=backend backend/.venv/Scripts/python.exe -m ruff check backend/app/services/adapters.py backend/tests/test_dispatcher.py backend/tests/test_db.py --no-cache
PYTHONPATH=backend backend/.venv/Scripts/python.exe -m pytest backend/tests/test_dispatcher.py -k "asset_source_inspect" -q
PYTHONPATH=backend backend/.venv/Scripts/python.exe -m pytest backend/tests/test_db.py -k "asset_source_inspect or subset_capabilities" -q
PYTHONPATH=backend backend/.venv/Scripts/python.exe -m pytest backend/tests -q
PYTHONPATH=backend backend/.venv/Scripts/python.exe scripts/check_surface_matrix.py
```

Results:

- targeted ruff passed
- targeted dispatcher tests passed
- targeted schema tests passed
- full backend tests passed
- surface matrix check passed

## Next Normalized Packet

Recommended next packet:

```text
Branch:
codex/ai-asset-forge-local-model-substrate-audit

PR title:
Audit local AI 3D model substrate options
```

Purpose:

Choose the first private/local 3D generation backend candidate for O3DE AI
Asset Forge without downloading models, changing dependencies, generating
assets, importing assets, or mutating an O3DE project.
