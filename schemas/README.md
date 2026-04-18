# schemas

Machine-readable schemas used by the O3DE agent control app.

Current contents:
- request and response envelopes
- control-plane entity schemas for runs, approvals, locks, events, executions, and artifacts
- tool policy schema
- dispatch result schema
- machine-readable route output schemas for root, health, readiness, version, and list endpoints
- per-tool argument and result schemas under `schemas/tools/`

Cross-linking:
- `/tools/catalog` exposes `adapter_family`, `args_schema`, and `result_schema` for every registered tool
- `/policies` exposes the same adapter/schema links alongside approval and lock policy metadata
- persisted execution `details` and artifact `metadata` now carry adapter provenance such as `adapter_family` and `adapter_contract_version`

Planned additions:
- UI layout schemas
- broader validation/result schemas beyond the current control-plane route surface
