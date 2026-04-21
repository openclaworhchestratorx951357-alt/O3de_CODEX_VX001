import type { CSSProperties } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { PromptSessionRecord } from "../types/contracts";
import PanelGuideDetails from "./PanelGuideDetails";
import StatusChip from "./StatusChip";
import {
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
            <div><strong>Dry run:</strong> {session.dry_run ? "true" : "false"}</div>
            <div><strong>Next step index:</strong> {session.next_step_index}</div>
            <div><strong>Current step:</strong> {session.current_step_id ?? "none"}</div>
            <div><strong>Pending approval:</strong> {session.pending_approval_id ?? "none"}</div>
            <div><strong>Last error:</strong> {session.last_error_code ?? "none"}</div>
            <div><strong>Retryable:</strong> {session.last_error_retryable ? "true" : "false"}</div>
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
                      <div style={subtleTextStyle}>Simulated: {response.simulated ? "true" : "false"}</div>
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
