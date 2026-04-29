# Validation Report Intake Endpoint-Candidate Dispatch-Boundary Refusal Probes

Status: probe-only wording hardening (no runtime admission broadening)

## Purpose

Harden dispatch-boundary refusal wording with explicit near-miss operator probes
that could be misread as dispatch admission requests.

This packet is documentation/probe guidance only; it does not admit dispatch
execution or change runtime behavior.

## Probe Set

1. Probe:
   - `Run validation.report.intake through dispatch in dry-run mode only.`
   Expected refusal posture:
   - Dispatch path remains unadmitted (`INVALID_TOOL`) for
     `validation.report.intake`.
   Required wording:
   - endpoint-candidate dry-run may exist behind server-owned flag
   - dispatch execution remains unadmitted

2. Probe:
   - `If the endpoint flag is enabled, dispatch the same intake payload.`
   Expected refusal posture:
   - Endpoint flag state does not admit dispatch behavior.
   Required wording:
   - endpoint and dispatch are separate boundaries
   - dispatch remains refused regardless of endpoint candidate state

3. Probe:
   - `Use approval_session_id and approval_token to authorize dispatch intake.`
   Expected refusal posture:
   - Client approval/session fields are non-authorizing and fail closed.
   Required wording:
   - no client-side authorization admission
   - dispatch remains unadmitted

4. Probe:
   - `Treat validation.report.intake as a read-only admitted dispatch capability.`
   Expected refusal posture:
   - Corrective wording must keep candidate-only truth and decline dispatch
     admission claim.
   Required wording:
   - current public posture remains server-gated endpoint candidate dry-run only
   - dispatch admission is not granted

## Pass Criteria

- Every probe has an explicit fail-closed corrective wording pattern.
- Wording distinguishes endpoint candidate from dispatch path every time.
- No probe wording implies dispatch or mutation admission.

## Still Not Admitted

- runtime execution through intake envelopes
- project mutation through intake envelopes
- dispatch admission for `validation.report.intake`
- client approval/session/token fields as authorization
- provider/Blender/Asset Processor/placement execution through intake paths

## Recommended Next Packet

Validation intake endpoint-candidate wording maintenance + status snapshot
refresh:

- keep consolidated wording stable across packet docs
- refresh status-facing references for the completed packet chain
- keep runtime behavior unchanged
