import type { CSSProperties } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { PromptSessionRecord } from "../types/contracts";
import PanelGuideDetails from "./PanelGuideDetails";

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
            <div><strong>Status:</strong> {session.status}</div>
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
          {session.latest_child_responses.length > 0 ? (
            <article title={promptExecutionTimelineChildLineageControlGuide.tooltip} style={groupStyle}>
              <strong>Latest child responses</strong>
              <pre style={responseStyle}>{JSON.stringify(session.latest_child_responses, null, 2)}</pre>
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
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
  background: "#ffffff",
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  background: "#f6f8fa",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const gridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const groupStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
} satisfies CSSProperties;

const responseStyle = {
  margin: "8px 0 0 0",
  padding: 12,
  borderRadius: 8,
  background: "#f6f8fa",
  overflowX: "auto",
  fontSize: 12,
  whiteSpace: "pre-wrap",
} satisfies CSSProperties;

const listStyle = {
  margin: "8px 0 0 0",
  paddingLeft: 18,
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "#57606a",
  fontSize: 13,
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "#57606a",
} satisfies CSSProperties;
