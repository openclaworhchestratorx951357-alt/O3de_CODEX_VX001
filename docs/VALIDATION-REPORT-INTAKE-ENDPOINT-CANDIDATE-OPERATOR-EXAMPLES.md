# Validation Report Intake Endpoint-Candidate Operator Examples

Status: operator examples packet (dry-run endpoint candidate only)

## Purpose

Provide operator-facing accepted/refused examples for the current
`validation.report.intake` endpoint candidate while preserving fail-closed
truth, no execution admission, and no mutation admission.

## Current boundary

- endpoint candidate: `POST /validation/report/intake`
- gate: `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED`
- default posture: blocked/fail-closed when gate is missing, explicit-off, or
  invalid
- explicit-on posture: dry-run-only parsing, no execution, no project write
- `/tools/dispatch` remains unadmitted for `validation.report.intake`
  (`INVALID_TOOL`)

## Safe accepted-dry-run example

Prerequisite:

- server-owned gate is explicit-on:
  `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED=true`

Request body:

```json
{
  "schema": "validation.report.intake.v1",
  "capability_name": "validation.report.intake",
  "report_id": "report-001",
  "produced_at_utc": "2026-04-29T00:00:00Z",
  "producer": {
    "tool_name": "test.run.gtest",
    "runner_family": "cli",
    "execution_mode": "simulated"
  },
  "result": {
    "status": "blocked",
    "summary": "Blocked by policy.",
    "warning_count": 0,
    "error_count": 1
  },
  "provenance": {
    "source_kind": "local-run",
    "artifact_refs": [
      "artifacts/reports/gtest.json"
    ]
  },
  "payload": {
    "tests": [
      {
        "name": "Suite.TestA",
        "status": "blocked"
      }
    ]
  },
  "integrity": {
    "payload_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "payload_size_bytes": 614
  }
}
```

Expected response truths:

- `dry_run_only=true`
- `execution_admitted=false`
- `write_executed=false`
- `project_write_admitted=false`
- `write_status=blocked`
- `endpoint_candidate=true`
- `endpoint_admitted=false`
- `admission_flag_state=explicit_on`
- `accepted=true`
- `fail_closed_reasons=[]`

## Safe refused-fail-closed example

Prerequisite:

- server-owned gate is explicit-on:
  `VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED=true`

Refused request example (client auth field injected):

```json
{
  "schema": "validation.report.intake.v1",
  "capability_name": "validation.report.intake",
  "report_id": "report-001",
  "produced_at_utc": "2026-04-29T00:00:00Z",
  "producer": {
    "tool_name": "test.run.gtest",
    "runner_family": "cli",
    "execution_mode": "simulated"
  },
  "result": {
    "status": "blocked",
    "summary": "Blocked by policy.",
    "warning_count": 0,
    "error_count": 1
  },
  "provenance": {
    "source_kind": "local-run",
    "artifact_refs": [
      "artifacts/reports/gtest.json"
    ]
  },
  "payload": {
    "tests": [
      {
        "name": "Suite.TestA",
        "status": "blocked"
      }
    ],
    "approval_state": "approved"
  },
  "integrity": {
    "payload_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "payload_size_bytes": 642
  }
}
```

Expected response truths:

- `dry_run_only=true`
- `execution_admitted=false`
- `write_executed=false`
- `project_write_admitted=false`
- `write_status=blocked`
- `endpoint_candidate=true`
- `endpoint_admitted=false`
- `admission_flag_state=explicit_on`
- `accepted=false`
- `fail_closed_reasons` includes `client_authorization_fields_forbidden`

## Blocked gate-state example

When the gate is missing, explicit-off, or invalid, endpoint calls are blocked
with `404`:

```text
Validation report intake endpoint candidate remains blocked while the server-owned admission flag is disabled.
```

## Unadmitted dispatch example

This remains refused regardless of endpoint gate state:

```json
{
  "tool": "validation.report.intake",
  "agent": "validation"
}
```

Expected dispatch truth:

- `ok=false`
- `error.code=INVALID_TOOL`
- no execution/mutation admission implied

## Final boundary

This examples packet does not admit endpoint execution, mutation, project
writes, provider generation, Blender execution, Asset Processor admission,
placement execution, or client authorization fields as authorization.
