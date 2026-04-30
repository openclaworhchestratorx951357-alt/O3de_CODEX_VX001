import type { CSSProperties } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { PromptSessionRecord } from "../types/contracts";
import PanelGuideDetails from "./PanelGuideDetails";
import StatusChip, { type StatusChipTone } from "./StatusChip";
import {
  getBooleanFlagTone,
  getExecutionModeTone,
  getPromptSessionStatusTone,
} from "./statusChipTones";

const promptExecutionTimelineGuide = getPanelGuide("prompt-execution-timeline");
const promptExecutionTimelineSummaryControlGuide = getPanelControlGuide("prompt-execution-timeline", "session-summary");
const promptExecutionTimelineAttemptsControlGuide = getPanelControlGuide("prompt-execution-timeline", "step-attempts");
const promptExecutionTimelineChildLineageControlGuide = getPanelControlGuide("prompt-execution-timeline", "child-lineage");

type PromptExecutionTimelineProps = {
  session: PromptSessionRecord | null;
};

export default function PromptExecutionTimeline({
  session,
}: PromptExecutionTimelineProps) {
  const childResponseSummaries = session
    ? session.latest_child_responses.map((response, index) => summarizeChildResponse(response, index))
    : [];
  const placementProofReview = session
    ? summarizePlacementProofOnlyReview(session)
    : null;

  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Prompt Execution Timeline</h3>
      <p style={subtleTextStyle}>
        Inspect prompt-session status, continuation state, child lineage, and latest child response evidence.
      </p>
      <PanelGuideDetails
        tooltip={promptExecutionTimelineGuide.tooltip}
        checklist={promptExecutionTimelineGuide.checklist}
      />
      {!session ? (
        <p style={emptyTextStyle}>Select a prompt session to inspect child lineage.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div title={promptExecutionTimelineSummaryControlGuide.tooltip} style={summaryCardStyle}>
            <div>
              <strong>Status:</strong>{" "}
              <StatusChip
                label={session.status}
                tone={getPromptSessionStatusTone(session.status)}
              />
            </div>
            <div><strong>Workspace:</strong> {session.workspace_id ?? "none selected"}</div>
            <div><strong>Executor:</strong> {session.executor_id ?? "none selected"}</div>
            <div>
              <strong>Dry run:</strong>{" "}
              <StatusChip
                label={session.dry_run ? "enabled" : "disabled"}
                tone={getBooleanFlagTone(session.dry_run, { trueTone: "warning" })}
              />
            </div>
            <div><strong>Next step index:</strong> {session.next_step_index}</div>
            <div><strong>Current step:</strong> {session.current_step_id ?? "none"}</div>
            <div><strong>Pending approval:</strong> {session.pending_approval_id ?? "none"}</div>
            <div><strong>Last error:</strong> {session.last_error_code ?? "none"}</div>
            <div>
              <strong>Retryable:</strong>{" "}
              <StatusChip
                label={session.last_error_retryable ? "yes" : "no"}
                tone={getBooleanFlagTone(session.last_error_retryable, { trueTone: "warning" })}
              />
            </div>
            <div><strong>Plan summary:</strong> {session.plan_summary ?? "none"}</div>
            <div><strong>Evidence summary:</strong> {session.evidence_summary ?? "none"}</div>
            <div><strong>Final result:</strong> {session.final_result_summary ?? "none"}</div>
          </div>
          {Object.keys(session.step_attempts).length > 0 ? (
            <article title={promptExecutionTimelineAttemptsControlGuide.tooltip} style={groupStyle}>
              <strong>Step attempts</strong>
              <ul style={listStyle}>
                {Object.entries(session.step_attempts).map(([stepId, attempts]) => (
                  <li key={stepId}>
                    {stepId}: {attempts}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
          {placementProofReview ? (
            <article style={groupStyle} aria-label="Placement proof-only review">
              <strong>Placement proof-only review</strong>
              <div style={badgeRowStyle}>
                <StatusChip label="proof-only" tone="warning" />
                <StatusChip label="fail-closed" tone="danger" />
                <StatusChip
                  label={`execution_admitted=${formatBooleanFlagValue(placementProofReview.executionAdmitted)}`}
                  tone={getTriStateBooleanTone(placementProofReview.executionAdmitted, { trueTone: "danger", falseTone: "neutral" })}
                />
                <StatusChip
                  label={`placement_write_admitted=${formatBooleanFlagValue(placementProofReview.placementWriteAdmitted)}`}
                  tone={getTriStateBooleanTone(placementProofReview.placementWriteAdmitted, { trueTone: "danger", falseTone: "neutral" })}
                />
                <StatusChip
                  label={`mutation_occurred=${formatBooleanFlagValue(placementProofReview.mutationOccurred)}`}
                  tone={getTriStateBooleanTone(placementProofReview.mutationOccurred, { trueTone: "danger", falseTone: "success" })}
                />
              </div>
              <div style={subtleTextStyle}>Capability: {placementProofReview.capabilityName}</div>
              <div style={subtleTextStyle}>Proof status: {placementProofReview.proofStatus ?? "not reported"}</div>
              <div style={subtleTextStyle}>Candidate id: {placementProofReview.candidateId ?? "not reported"}</div>
              <div style={subtleTextStyle}>Candidate label: {placementProofReview.candidateLabel ?? "not reported"}</div>
              <div style={subtleTextStyle}>
                Artifact reference: {formatArtifactReference(placementProofReview.artifactLabel, placementProofReview.artifactId)}
              </div>
              <div style={subtleTextStyle}>
                Staged source path: {placementProofReview.stagedSourceRelativePath ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>
                Target level path: {placementProofReview.targetLevelRelativePath ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>
                Target entity: {placementProofReview.targetEntityName ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>
                Target component: {placementProofReview.targetComponent ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>
                Stage-write evidence ref: {placementProofReview.stageWriteEvidenceReference ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>
                Stage-write readback ref: {placementProofReview.stageWriteReadbackReference ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>
                Stage-write readback status: {placementProofReview.stageWriteReadbackStatus ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>Execution mode: {placementProofReview.executionMode ?? "not reported"}</div>
              <div style={subtleTextStyle}>
                Inspection surface: {placementProofReview.inspectionSurface ?? "not reported"}
              </div>
              <div style={subtleTextStyle}>
                Placement execution admitted:{" "}
                {formatBooleanLabel(placementProofReview.executionAdmitted, "execution_admitted")}
              </div>
              <div style={subtleTextStyle}>
                Placement write admitted:{" "}
                {formatBooleanLabel(placementProofReview.placementWriteAdmitted, "placement_write_admitted")}
              </div>
              <div style={subtleTextStyle}>
                Mutation occurred:{" "}
                {formatBooleanLabel(placementProofReview.mutationOccurred, "mutation_occurred")}
              </div>
              <div style={subtleTextStyle}>
                Read only: {formatBooleanLabel(placementProofReview.readOnly, "read_only")}
              </div>
              {placementProofReview.failClosedReasons.length > 0 ? (
                <div style={subtleTextStyle}>
                  Fail-closed reasons: {placementProofReview.failClosedReasons.join(", ")}
                </div>
              ) : null}
              {placementProofReview.serverDecisionCode
              || placementProofReview.serverDecisionState
              || placementProofReview.serverStatus ? (
                <div style={subtleTextStyle}>
                  Server approval: decision_code={placementProofReview.serverDecisionCode ?? "not reported"},{" "}
                  decision_state={placementProofReview.serverDecisionState ?? "not reported"},{" "}
                  status={placementProofReview.serverStatus ?? "not reported"}.
                </div>
                ) : null}
              {placementProofReview.serverReason ? (
                <div style={subtleTextStyle}>Server blocker reason: {placementProofReview.serverReason}</div>
              ) : null}
              {placementProofReview.serverRemediation ? (
                <article style={serverRemediationCardStyle}>
                  <strong style={serverRemediationHeadingStyle}>Server blocker remediation</strong>
                  <div style={subtleTextStyle}>{placementProofReview.serverRemediation}</div>
                </article>
              ) : null}
              <div style={subtleTextStyle}>
                Placement proof-only remains fail-closed and non-mutating: placement runtime execution is non-admitted, placement writes are non-admitted, and no mutation occurred.
              </div>
              <div style={subtleTextStyle}>
                Next missing gate: exact placement admission corridor with server-owned approval/session truth, readback proof, and revert/restore proof.
              </div>
            </article>
          ) : null}
          {childResponseSummaries.length > 0 ? (
            <article title={promptExecutionTimelineChildLineageControlGuide.tooltip} style={groupStyle}>
              <strong>Latest child responses</strong>
              <div style={childResponseGridStyle}>
                {childResponseSummaries.map((response) => (
                  <article key={response.key} style={childResponseCardStyle}>
                    <div style={childResponseHeaderStyle}>
                      <strong>{response.label}</strong>
                      <StatusChip
                        label={response.outcomeLabel}
                        tone={response.ok === true ? "success" : response.ok === false ? "danger" : "neutral"}
                      />
                    </div>
                    <div style={subtleTextStyle}>Tool: {response.tool ?? "not reported"}</div>
                    <div style={subtleTextStyle}>
                      Execution mode:{" "}
                      {response.executionMode ? (
                        <StatusChip
                          label={response.executionMode}
                          tone={getExecutionModeTone(response.executionMode)}
                        />
                      ) : (
                        "not reported"
                      )}
                    </div>
                    {typeof response.simulated === "boolean" ? (
                      <div style={subtleTextStyle}>
                        Simulated:{" "}
                        <StatusChip
                          label={response.simulated ? "yes" : "no"}
                          tone={getBooleanFlagTone(response.simulated, { trueTone: "warning" })}
                        />
                      </div>
                    ) : null}
                    {response.errorCode ? (
                      <div style={subtleTextStyle}>Error code: {response.errorCode}</div>
                    ) : null}
                    <pre style={responseStyle}>{JSON.stringify(response.raw, null, 2)}</pre>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
          <div style={gridStyle}>
            <TimelineGroup title="Child runs" values={session.child_run_ids} />
            <TimelineGroup title="Child executions" values={session.child_execution_ids} />
            <TimelineGroup title="Child artifacts" values={session.child_artifact_ids} />
            <TimelineGroup title="Child events" values={session.child_event_ids} />
          </div>
        </div>
      )}
    </section>
  );
}

type ChildResponseSummary = {
  key: string;
  label: string;
  raw: Record<string, unknown>;
  ok?: boolean;
  outcomeLabel: string;
  tool?: string;
  executionMode?: string;
  simulated?: boolean;
  errorCode?: string;
};

type PlacementProofOnlyReview = {
  capabilityName: string;
  proofStatus?: string;
  candidateId?: string;
  candidateLabel?: string;
  artifactId?: string;
  artifactLabel?: string;
  stagedSourceRelativePath?: string;
  targetLevelRelativePath?: string;
  targetEntityName?: string;
  targetComponent?: string;
  stageWriteEvidenceReference?: string;
  stageWriteReadbackReference?: string;
  stageWriteReadbackStatus?: string;
  executionMode?: string;
  inspectionSurface?: string;
  executionAdmitted?: boolean;
  placementWriteAdmitted?: boolean;
  mutationOccurred?: boolean;
  readOnly?: boolean;
  failClosedReasons: string[];
  serverDecisionCode?: string;
  serverDecisionState?: string;
  serverStatus?: string;
  serverReason?: string;
  serverRemediation?: string;
};

function summarizePlacementProofOnlyReview(
  session: PromptSessionRecord,
): PlacementProofOnlyReview | null {
  for (const response of session.latest_child_responses) {
    const responseRecord = asRecord(response);
    if (!responseRecord) {
      continue;
    }
    const result = asRecord(responseRecord.result);
    const executionDetails = asRecord(responseRecord.execution_details);
    const capabilityName = readString(executionDetails, "capability_name");
    const resultTool = readString(result, "tool") ?? readString(responseRecord, "tool");

    if (capabilityName !== "editor.placement.proof_only" && resultTool !== "editor.placement.proof_only") {
      continue;
    }

    const serverApprovalEvaluation = asRecord(executionDetails?.server_approval_evaluation);
    const decisionCode = readString(serverApprovalEvaluation, "decision_code");

    return {
      capabilityName: capabilityName ?? "editor.placement.proof_only",
      proofStatus: readString(executionDetails, "proof_status"),
      candidateId: readString(executionDetails, "candidate_id"),
      candidateLabel: readString(executionDetails, "candidate_label"),
      artifactId:
        readString(executionDetails, "artifact_id")
        ?? readString(executionDetails, "proof_artifact_id")
        ?? readString(result, "artifact_id")
        ?? readString(responseRecord, "artifact_id"),
      artifactLabel:
        readString(executionDetails, "artifact_label")
        ?? readString(result, "artifact_label")
        ?? readString(responseRecord, "artifact_label"),
      stagedSourceRelativePath: readString(executionDetails, "staged_source_relative_path"),
      targetLevelRelativePath: readString(executionDetails, "target_level_relative_path"),
      targetEntityName: readString(executionDetails, "target_entity_name"),
      targetComponent: readString(executionDetails, "target_component"),
      stageWriteEvidenceReference: readString(executionDetails, "stage_write_evidence_reference"),
      stageWriteReadbackReference: readString(executionDetails, "stage_write_readback_reference"),
      stageWriteReadbackStatus: readString(executionDetails, "stage_write_readback_status"),
      executionMode: readString(result, "execution_mode") ?? readString(responseRecord, "execution_mode"),
      inspectionSurface: readString(executionDetails, "source") ?? readString(executionDetails, "inspection_surface"),
      executionAdmitted: readBoolean(executionDetails, "execution_admitted"),
      placementWriteAdmitted: readBoolean(executionDetails, "placement_write_admitted"),
      mutationOccurred: readBoolean(executionDetails, "mutation_occurred"),
      readOnly: readBoolean(executionDetails, "read_only"),
      failClosedReasons: readStringArray(executionDetails, "fail_closed_reasons"),
      serverDecisionCode: decisionCode,
      serverDecisionState: readString(serverApprovalEvaluation, "decision_state"),
      serverStatus: readString(serverApprovalEvaluation, "status"),
      serverReason: readString(serverApprovalEvaluation, "reason"),
      serverRemediation: extractServerBlockerRemediation(session.final_result_summary, decisionCode),
    };
  }

  return null;
}

function extractServerBlockerRemediation(
  finalResultSummary: string | null | undefined,
  decisionCode: string | undefined,
): string | undefined {
  if (!finalResultSummary) {
    return undefined;
  }

  const marker = decisionCode
    ? `Server blocker remediation (${decisionCode}): `
    : "Server blocker remediation:";
  const markerIndex = finalResultSummary.indexOf(marker);
  if (markerIndex < 0) {
    return undefined;
  }

  const startIndex = markerIndex + marker.length;
  const tail = finalResultSummary.slice(startIndex).trim();
  const stopMarkers = [
    " No editor placement runtime command was admitted or executed.",
    " Placement proof-only remains fail-closed",
  ];

  let endIndex = tail.length;
  for (const stopMarker of stopMarkers) {
    const markerPosition = tail.indexOf(stopMarker);
    if (markerPosition >= 0) {
      endIndex = Math.min(endIndex, markerPosition);
    }
  }

  return tail.slice(0, endIndex).trim();
}

function summarizeChildResponse(
  response: Record<string, unknown>,
  index: number,
): ChildResponseSummary {
  const result = asRecord(response.result);
  const error = asRecord(response.error);
  const ok = typeof response.ok === "boolean" ? response.ok : undefined;

  return {
    key: `child-response-${index}`,
    label: `Child ${index + 1}`,
    raw: response,
    ok,
    outcomeLabel: ok === true ? "ok" : ok === false ? "error" : "unknown",
    tool: readString(result, "tool") ?? readString(response, "tool"),
    executionMode:
      readString(result, "execution_mode")
      ?? readString(response, "execution_mode"),
    simulated:
      readBoolean(result, "simulated")
      ?? readBoolean(response, "simulated"),
    errorCode: readString(error, "code"),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  if (!record) {
    return undefined;
  }

  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | undefined {
  if (!record) {
    return undefined;
  }

  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(record: Record<string, unknown> | null, key: string): string[] {
  if (!record) {
    return [];
  }

  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function formatBooleanLabel(value: boolean | undefined, flagName: string): string {
  if (value === undefined) {
    return "unknown";
  }
  return value ? `yes (${flagName}=true)` : `no (${flagName}=false)`;
}

function formatBooleanFlagValue(value: boolean | undefined): string {
  if (value === undefined) {
    return "unknown";
  }
  return value ? "true" : "false";
}

function getTriStateBooleanTone(
  value: boolean | undefined,
  options: { trueTone: StatusChipTone; falseTone: StatusChipTone },
): StatusChipTone {
  if (value === undefined) {
    return "neutral";
  }
  return getBooleanFlagTone(value, {
    trueTone: options.trueTone,
    falseTone: options.falseTone,
  });
}

function formatArtifactReference(label: string | undefined, id: string | undefined): string {
  if (!label && !id) {
    return "not reported";
  }
  if (label && id) {
    return `${label} (${id})`;
  }
  return label ?? id ?? "not reported";
}

function TimelineGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <article title={promptExecutionTimelineChildLineageControlGuide.tooltip} style={groupStyle}>
      <strong>{title}</strong>
      {values.length === 0 ? (
        <div style={subtleTextStyle}>none</div>
      ) : (
        <ul style={listStyle}>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

const panelStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "var(--app-panel-padding)",
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  background: "var(--app-panel-bg)",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const gridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const groupStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const childResponseGridStyle = {
  display: "grid",
  gap: 8,
  marginTop: 8,
} satisfies CSSProperties;

const childResponseCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  background: "var(--app-panel-bg-muted)",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const childResponseHeaderStyle = {
  display: "flex",
  gap: 8,
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
} satisfies CSSProperties;

const badgeRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8,
} satisfies CSSProperties;

const serverRemediationCardStyle = {
  border: "1px solid rgba(245, 189, 88, 0.45)",
  borderRadius: "var(--app-card-radius)",
  padding: "10px 12px",
  background: "rgba(120, 83, 17, 0.14)",
  display: "grid",
  gap: 4,
} satisfies CSSProperties;

const serverRemediationHeadingStyle = {
  color: "var(--app-text-color)",
  fontSize: 13,
} satisfies CSSProperties;

const responseStyle = {
  margin: "8px 0 0 0",
  padding: 12,
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-command-bg)",
  color: "var(--app-command-text)",
  overflowX: "auto",
  fontSize: 12,
  whiteSpace: "pre-wrap",
} satisfies CSSProperties;

const listStyle = {
  margin: "8px 0 0 0",
  paddingLeft: 18,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;
