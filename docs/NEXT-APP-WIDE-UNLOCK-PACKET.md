# Next App-wide Unlock Packet

## Recommendation
Validation intake endpoint-candidate admission decision + surface-matrix update
packet.

## Why this is next
- Validation intake endpoint-candidate audit/review coverage now exists for all
  gate states (`missing_default_off`, `explicit_off`, `explicit_on`,
  `invalid_default_off`) with fail-closed endpoint review/status fields.
- Dispatch for `validation.report.intake` remains unadmitted and no
  execution/mutation corridor was introduced.
- The next safest move is an explicit admission decision packet that records
  whether this server-gated endpoint candidate remains reviewable/default-off or
  advances to a narrow admitted read-only surface.

## Scope
- docs+matrix focused packet (optional tests/docs alignment updates)
- capture old/new maturity decision for `validation.report.intake`
- update surface/maturity docs with the explicit admission decision
- preserve server-owned default-off behavior unless explicitly approved
- no execution or mutation admission changes

## Safety constraints
- no runtime bridge execution changes
- no provider/Blender/Asset Processor execution
- no placement execution
- no project file mutation
- no client approval fields treated as authorization

## Acceptance checks
- maturity decision is explicit and evidence-backed
- endpoint gate/refusal evidence is linked from the decision packet
- dispatch path for `validation.report.intake` remains unadmitted unless a
  separate admission packet says otherwise
- no mutation/execution admission changes
- docs and matrix rows align on the same capability truth

## Alternative considered
Flow Trigger Suite productization plan.

This remains valid, but validation-intake admission audit/review is recommended
after the admission decision packet so the endpoint boundary remains explicit.
