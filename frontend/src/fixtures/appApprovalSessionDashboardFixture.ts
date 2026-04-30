export type ApprovalSessionTruthLabel =
  | "admitted-real"
  | "preflight-only"
  | "gui-demo"
  | "blocked";

export type ApprovalSessionGateState =
  | "missing_default_off"
  | "explicit_off"
  | "explicit_on"
  | "invalid_default_off";

export type ApprovalSessionDashboardRow = {
  lane: string;
  sourceSurface: string;
  truthLabel: ApprovalSessionTruthLabel;
  authorizationModel: string;
  runtimeAdmission: string;
  summary: string;
  nextGate: string;
};

export type ApprovalSessionGateStateRow = {
  gateState: ApprovalSessionGateState;
  endpointAvailability: string;
  reviewImplication: string;
};

export type ApprovalSessionFailClosedMatrixRow = {
  scenario: string;
  expectedStatus: string;
  boundary: string;
};

export const appApprovalSessionDashboardGeneratedAt = "2026-04-29";

export const appApprovalSessionDashboardOperatorReviewFields = [
  "admission_flag_name",
  "admission_flag_state",
  "admission_flag_enabled",
  "endpoint_candidate",
  "endpoint_admitted",
  "dry_run_only",
  "execution_admitted",
  "write_executed",
  "project_write_admitted",
  "write_status",
  "accepted",
  "fail_closed_reasons",
] as const;

export const appApprovalSessionDashboardGateStateRows: readonly ApprovalSessionGateStateRow[] = [
  {
    gateState: "missing_default_off",
    endpointAvailability: "endpoint blocked (404)",
    reviewImplication: "default-off safety when no operator flag is present",
  },
  {
    gateState: "explicit_off",
    endpointAvailability: "endpoint blocked (404)",
    reviewImplication: "operator explicitly keeps intake candidate disabled",
  },
  {
    gateState: "explicit_on",
    endpointAvailability: "endpoint candidate returns dry-run review payload",
    reviewImplication: "still non-admitted for execution and mutation",
  },
  {
    gateState: "invalid_default_off",
    endpointAvailability: "endpoint blocked (404)",
    reviewImplication: "invalid values fail closed to default-off behavior",
  },
];

export const appApprovalSessionDashboardFailClosedRows: readonly ApprovalSessionFailClosedMatrixRow[] = [
  {
    scenario: "Endpoint gate is missing/off/invalid",
    expectedStatus: "POST /validation/report/intake responds 404 blocked detail",
    boundary: "no execution admission and no mutation admission",
  },
  {
    scenario: "Client authorization fields are supplied",
    expectedStatus: "dry-run payload keeps accepted=false with client_authorization_fields_forbidden",
    boundary: "client fields remain intent-only and non-authorizing",
  },
  {
    scenario: "Dispatch route is used for validation.report.intake",
    expectedStatus: "/tools/dispatch keeps validation.report.intake unadmitted (INVALID_TOOL)",
    boundary: "endpoint candidate does not broaden tool-dispatch admission",
  },
];

export const appApprovalSessionDashboardRows: readonly ApprovalSessionDashboardRow[] = [
  {
    lane: "General approvals queue",
    sourceSurface: "/approvals + /approvals/cards + approve/reject",
    truthLabel: "admitted-real",
    authorizationModel: "server-owned approval record + token",
    runtimeAdmission: "decision routes admitted; bounded to existing approval records",
    summary: "Pending approvals can be approved/rejected through server-managed records with run/event updates.",
    nextGate: "dashboard truth refresh + cross-surface review linkage",
  },
  {
    lane: "Asset Forge approval sessions",
    sourceSurface: "/asset-forge/approval-sessions*",
    truthLabel: "preflight-only",
    authorizationModel: "server-owned session model; client fields are intent-only",
    runtimeAdmission: "mutation execution not admitted",
    summary: "Session evaluation is fail-closed and can be ready-but-not-admitted while mutation lanes stay blocked.",
    nextGate: "separate mutation-admission packet (explicit approval required)",
  },
  {
    lane: "Approval session dashboard shell",
    sourceSurface: "frontend static fixture shell",
    truthLabel: "gui-demo",
    authorizationModel: "display-only; no authorization side effects",
    runtimeAdmission: "no backend admission change",
    summary: "Dashboard shell improves operator clarity without introducing new runtime capability.",
    nextGate: "truth refresh + validation linkage",
  },
  {
    lane: "Client authorization fields",
    sourceSurface: "approval_state / approval_session_id / approval_token",
    truthLabel: "blocked",
    authorizationModel: "intent-only; never sufficient for admission alone",
    runtimeAdmission: "client-only authorization remains blocked",
    summary: "Client-supplied approval fields are non-authorizing and must not be treated as admission grants.",
    nextGate: "keep refusal assertions and boundary wording explicit",
  },
  {
    lane: "Validation intake endpoint candidate",
    sourceSurface: "/validation/report/intake",
    truthLabel: "preflight-only",
    authorizationModel: "server-owned endpoint flag + fail-closed parser checks",
    runtimeAdmission: "dry-run-only plan payload; execution and mutation blocked",
    summary:
      "When gate state is explicit_on, response still reports endpoint_admitted=false, execution_admitted=false, and write_status=blocked.",
    nextGate: "long-hold checkpoint maintenance; keep dispatch unadmitted",
  },
];
