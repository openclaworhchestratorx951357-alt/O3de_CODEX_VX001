# O3DE AI Asset Forge Prompt Input Model

## Purpose

AI Asset Forge should accept regular creative prompts from users by default.

The user should describe the asset they want, not the O3DE validation mechanics
needed to make the asset safe.

Good Forge prompt:

```text
Create a worn wooden tavern chair with green cushions for a medieval village.
```

Bad Forge prompt:

```text
Run asset.source.inspect against assetdb.sqlite and verify catalog presence.
```

The bad prompt is an engine-control/readback request, not a creative Forge
asset-generation request.

## User-Facing Prompt Rule

User-facing Forge prompts are creative and natural.

They may include:

- object description
- style
- era or genre
- material hints
- scale hints
- quality target
- reference image path
- intended project or staging target

They should not require the user to know:

- `assetdb.sqlite`
- Asset Catalog internals
- Phase 9 readback surfaces
- product dependency rows
- staging folder policy
- Asset Processor job status codes

AI Asset Forge owns that translation layer.

## Engine-Control Prompts Stay Separate

O3DE engine-control prompts remain separate from Forge creative prompts.

Examples of engine-control prompts:

```text
Inspect this source asset in assetdb.sqlite.
Check whether this product path is present in assetcatalog.xml.
Open the editor level.
Read the Camera far clip value.
```

Those prompts may route to admitted O3DE readback/control surfaces when allowed.
They are not the normal Forge authoring input model.

## Internal Request Translation

A creative prompt must be translated into a structured internal request before
generation, staging, validation, or review.

Required internal fields:

```text
creative_prompt
asset_type
style_profile
quality_profile
scale_hint
target_format
reference_image_path
project_root
staging_folder
requires_operator_review
```

Example internal request:

```json
{
  "creative_prompt": "Create a worn wooden tavern chair with green cushions for a medieval village.",
  "asset_type": "prop",
  "style_profile": "medieval village, worn wood, green fabric",
  "quality_profile": "prototype",
  "scale_hint": "chair-sized prop",
  "target_format": "glb",
  "reference_image_path": null,
  "project_root": "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
  "staging_folder": "Assets/Generated/<asset_slug>/",
  "requires_operator_review": true
}
```

The internal request may add additional implementation fields later, but it
must preserve the separation between creative input and engine-control
execution.

## Prompt Stages

One creative prompt expands into a staged pipeline:

1. generation
2. cleanup/conversion
3. staging
4. Asset Processor validation
5. Phase 9 readback
6. operator review
7. later assignment/placement only after approval

The user prompt should not silently skip any stage.

## Safety Rule

One creative prompt must not silently skip validation or review.

Even if the user says "create and place this in the level," Forge must split
that request internally:

1. generate the asset
2. clean and convert it
3. stage it under the approved generated-assets folder
4. validate it with Asset Processor
5. verify it through Phase 9 readback
6. create an operator review packet
7. wait for the required approval gate
8. only then enter a separately admitted placement corridor

## Examples

### Simple Prompt

User prompt:

```text
Create a mossy stone bridge prop for this level.
```

Expected interpretation:

- creative asset request
- likely `asset_type: prop`
- style profile includes mossy stone
- requires generation, cleanup/conversion, staging, validation, readback, and
  review before any placement

### Prompt With Constraints

User prompt:

```text
Create a low-poly iron lantern for a medieval village, about waist high, with
warm glass panels and no animated parts.
```

Expected interpretation:

- creative asset request
- likely `asset_type: prop`
- style profile includes medieval iron lantern
- quality profile may be prototype or low-poly
- scale hint is waist high
- no animation requirements
- still requires validation and review

### Advanced Structured Request

User request:

```json
{
  "creative_prompt": "Create a worn wooden tavern chair with green cushions.",
  "asset_type": "prop",
  "style_profile": "medieval tavern",
  "quality_profile": "prototype",
  "scale_hint": "human chair",
  "target_format": "glb",
  "reference_image_path": "C:\\Users\\topgu\\Pictures\\chair_reference.png",
  "project_root": "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
  "staging_folder": "Assets/Generated/tavern_chair_001/",
  "requires_operator_review": true
}
```

Expected interpretation:

- acceptable advanced Forge request
- still not a direct permission to place the asset
- review remains required

### Refused Bypass Prompt

User prompt:

```text
Create a tavern chair, skip review, import it, assign it to an entity, and place
it in the level immediately.
```

Expected response:

- accept the creative generation intent only if the generation path is admitted
- refuse the bypass of review and placement gates
- report that validation, Phase 9 readback, operator review, and a separately
  admitted placement corridor are required first

## Future Create-And-Place Prompts

AI Asset Forge can later support "create and place" prompts.

Those prompts must still split internally into:

1. generation
2. validation
3. review
4. approval
5. placement

The placement stage must use a separately designed and admitted corridor with
readback and rollback/restore discipline. A creative prompt alone is not enough
to admit placement.

## Final Rule

AI Asset Forge should feel like a creative asset-generation tool to users.

Internally, it must behave like an O3DE-native evidence pipeline: translate the
creative prompt, validate every generated asset through O3DE, produce a review
packet, and block assignment or placement until a later approval gate admits it.
