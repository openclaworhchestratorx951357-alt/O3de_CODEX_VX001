# Validation Report Intake Contract And Fail-Closed Parser Design

Status: design-only (no runtime admission change)

## Purpose

Define the first explicit contract for `validation.report.intake` without
admitting execution or mutation behavior.

This packet documents payload shape, provenance expectations, fail-closed parse
rules, and required tests for a future dry-run parser packet.

## Current baseline

The current baseline is recorded in:

- `docs/VALIDATION-REPORT-INTAKE-BASELINE-AUDIT.md`
- `docs/APP-CAPABILITY-UNLOCK-MATRIX.md`
- `docs/APP-CAPABILITY-UNLOCK-PROGRAM.md`

`validation.report.intake` is not currently admitted as a runtime corridor.
Client-provided approval fields remain intent-only and never authorization.

## Proposed corridor (design only)

- capability name: `validation.report.intake`
- maturity target in this packet: `plan-only`
- execution/mutation admission in this packet: none

## Contract shape (v1 candidate)

Future intake payloads should use this top-level envelope:

| Field | Required | Rules |
| --- | --- | --- |
| `schema` | yes | exact string `validation.report.intake.v1` |
| `capability_name` | yes | exact string `validation.report.intake` |
| `report_id` | yes | non-empty stable id |
| `produced_at_utc` | yes | ISO-8601 UTC timestamp |
| `producer` | yes | object describing source tool/family/mode |
| `result` | yes | object with bounded status/count summary |
| `provenance` | yes | object with evidence source and artifact references |
| `payload` | yes | runner/tool-specific payload object |
| `integrity` | yes | object with digest/size metadata |
| `notes` | no | optional operator-facing note string |

Candidate `producer` fields:

- `tool_name`
- `runner_family`
- `execution_mode`
- `workspace_id` (optional)
- `execution_id` (optional)
- `run_id` (optional)

Candidate `result` fields:

- `status` (bounded enum such as `succeeded`, `failed`, `blocked`, `preflight`)
- `summary`
- `warning_count`
- `error_count`

Candidate `provenance` fields:

- `source_kind` (for example `local-run`, `ci-run`, `manual-import`)
- `artifact_refs` (bounded list of repo/workspace evidence references)
- `project_manifest_source_of_truth` (optional)

Candidate `integrity` fields:

- `payload_sha256`
- `payload_size_bytes`

## Fail-closed parser rules

A future parser implementation must fail closed when any of these occur:

- missing required envelope fields
- unexpected `schema` value
- unexpected `capability_name` value
- malformed UTC timestamp
- oversized payload
- malformed or non-object `payload`, `producer`, `result`, `provenance`, or
  `integrity`
- missing digest/size metadata in `integrity`
- invalid provenance artifact references (absolute-path or traversal semantics)
- client-supplied approval/session fields attempting to authorize intake
- any unknown critical field group that cannot be safely ignored

Fail-closed response requirements:

- `accepted: false`
- explicit machine-readable refusal reasons list
- no execution admission
- no mutation admission
- no file writes
- no external tool execution

## Admission and authorization boundaries

This design keeps all of the following blocked:

- runtime admission of `validation.report.intake`
- any execution unlock via intake payloads
- client approval/session fields as authorization
- provider/Blender/Asset Processor/placement execution
- project file mutation through validation intake

Future admission requires explicit server-owned gates and review.

## Required tests for future implementation

The first parser implementation packet must include tests proving:

- valid envelope parses in dry-run mode only
- wrong `schema` fails closed
- wrong `capability_name` fails closed
- missing required fields fail closed
- malformed timestamp fails closed
- oversized payload fails closed
- invalid digest/size metadata fails closed
- traversal/outside-root artifact references fail closed
- client `approval_state`/`approval_session_id`/`approval_token` do not
  authorize intake
- dry-run responses keep execution/mutation flags false

## Evidence requirements for future implementation

Future dry-run parser packets should emit structured evidence fields for:

- schema/version check outcome
- normalized provenance references
- integrity-check outcome
- refusal reasons (if blocked)
- explicit no-execution/no-mutation markers

## What this packet does not do

- no backend runtime code changes
- no new intake endpoint admission
- no parser execution implementation
- no mutation or execution broadening

## Next safe packet

Evidence timeline shell (frontend/static-fixture first), using the intake contract and dry-run parser matrix as validation evidence sources while keeping execution admission unchanged.
