# O3DE AI Asset Forge Integration Architecture

## Architecture overview

O3DE AI Asset Forge is a private O3DE-native asset generation pipeline. It
must use O3DE's source asset, Asset Processor, Asset Database, Asset Catalog,
and operator-review flow instead of bypassing the engine.

Planned components:

1. Prompt Planner
2. Generation Backend Adapter
3. Mesh Cleanup Adapter
4. O3DE Source Asset Stager
5. Asset Processor Readiness Monitor
6. Phase 9 Asset Readback Adapter
7. Asset Catalog Cross-checker
8. Provenance Store
9. Operator Review Packet
10. Future Entity Placement Corridor

## Component responsibilities

### Prompt Planner

Turns an operator prompt, image, or reference packet into a bounded generation
request. It must capture intent, target asset type, naming constraints, license
expectations, and safety boundaries before any generation backend runs.

The user-facing input should be a normal creative prompt, not O3DE
engine-control syntax. The prompt input contract is defined in
`docs/AI-ASSET-FORGE-PROMPT-INPUT-MODEL.md`. For example, "Create a worn wooden
tavern chair with green cushions for a medieval village" is a Forge prompt;
"Run asset.source.inspect against assetdb.sqlite and verify catalog presence"
is an engine-control/readback prompt.

The Prompt Planner translates creative input into structured internal fields
such as `creative_prompt`, `asset_type`, `style_profile`, `quality_profile`,
`scale_hint`, `target_format`, `reference_image_path`, `project_root`,
`staging_folder`, and `requires_operator_review`.

### Generation Backend Adapter

Calls a local/private 3D generation backend selected by the substrate audit.
The default production path must not call Meshy APIs or rely on external
proprietary asset-generation services.

The first proof-only backend candidate is TripoSR, selected by
`docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`. That selection only
authorizes a future local-generation proof outside the repository and outside
O3DE after explicit operator approval for any downloads or dependency
installation. It does not admit production generation.

### Mesh Cleanup Adapter

Normalizes generated output into O3DE-friendly source assets. Future work may
use Blender automation for scale normalization, pivot correction, mesh cleanup,
texture packing, format export, and later collision/LOD preparation.

Blender automation is the likely cleanup/conversion layer after the first raw
generated asset proof exists. It is not the generation backend.

### O3DE Source Asset Stager

Places a generated source asset into an approved project staging folder only
after a design, readiness, proof, and explicit mutation approval path exists.
This planning packet does not admit staging.

### Asset Processor Readiness Monitor

Determines whether Asset Processor has produced cache products for the staged
source asset. It must report readiness or blocked states instead of silently
running Asset Processor.

### Phase 9 Asset Readback Adapter

Uses project-general Phase 9 readback to inspect source, product, dependency,
and catalog evidence in read-only mode.

### Asset Catalog Cross-checker

Confirms product-path presence in the platform Asset Catalog before a generated
asset can be treated as runtime-available.

### Provenance Store

Records generation backend, model version, prompt, references, seed/settings,
license, timestamps, hashes, source/product paths, dependency evidence, catalog
presence, and operator approval state.

### Operator Review Packet

Presents the generated asset, provenance, readback evidence, warnings, quality
notes, and approval state before any entity assignment or level placement.

The review contract is defined in
`docs/AI-ASSET-FORGE-OPERATOR-REVIEW-PACKET.md`. It requires provenance,
source/product/dependency/catalog evidence, Asset Processor warnings,
license/commercial status, quality notes, and an explicit operator decision
before any future assignment or placement corridor may proceed.

### Future Entity Placement Corridor

Later exact corridors may assign generated assets to entities or place/update
entities in a level. Those corridors require separate design, proof, admission,
review, and restore/rollback discipline.

## Data flow

Prompt:

```text
Create a mossy stone bridge prop for this level
```

Flow:

- prompt interpreted
- structured generation request created
- local model generates mesh
- cleanup prepares asset
- source asset staged
- Asset Processor processes it
- `assetdb.sqlite` confirms source/product
- `assetcatalog.xml` confirms product availability
- operator review packet created
- later entity assignment/placement is approved separately

## Integration with Phase 9

Phase 9 must become the verification layer for every generated asset.

Required Phase 9 functions:

- discover project root
- discover asset database
- discover platform catalog
- inspect source
- inspect product
- inspect dependencies
- cross-check catalog presence
- report blocked/readiness states

Generated assets must not be considered usable from a raw file alone. They
become O3DE-usable candidates only after Phase 9 can read back O3DE evidence
for the selected project, platform, source asset, product asset, dependency
rows, and catalog presence.

## Production readiness requirements

Before AI Asset Forge can be production-ready:

- project-general asset readback must work
- arbitrary source asset input must be safe/path-normalized
- platform cache selection must be explicit
- schema mismatch must be handled
- generated asset provenance must be stored
- generated assets must be reviewed before use
- no generated asset should be silently placed in a level
- the selected generation backend must pass the license, hardware, storage, and
  provenance gates in `docs/AI-ASSET-FORGE-LOCAL-MODEL-SUBSTRATE-AUDIT.md`

## O3DE-specific conventions

Future conventions:

- generated source assets use `Assets/Generated/<asset_slug>/`
- a metadata file lives next to generated source assets
- generated Cache files are never committed to the repo
- source asset names use stable lowercase slugs unless O3DE project rules
  require otherwise
- product readback is required before entity assignment
- an operator review packet is required before placement

These conventions are not yet admitted behavior. They are design targets for
later Forge readiness and proof packets.
