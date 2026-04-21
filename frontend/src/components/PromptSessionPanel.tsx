import type { CSSProperties } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { PromptSessionRecord } from "../types/contracts";
import PanelGuideDetails from "./PanelGuideDetails";

const promptSessionsGuide = getPanelGuide("prompt-sessions");
const promptSessionsEntryControlGuide = getPanelControlGuide("prompt-sessions", "session-entry");

type PromptSessionPanelProps = {
  sessions: PromptSessionRecord[];
  selectedPromptId: string | null;
  onSelect: (promptId: string) => void;
};

export default function PromptSessionPanel({
  sessions,
  selectedPromptId,
  onSelect,
}: PromptSessionPanelProps) {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Prompt Sessions</h3>
      <p style={subtleTextStyle}>
        Select the persisted prompt session you want to inspect, continue, or explain across Prompt Studio.
      </p>
      <PanelGuideDetails
        tooltip={promptSessionsGuide.tooltip}
        checklist={promptSessionsGuide.checklist}
      />
      {sessions.length === 0 ? (
        <p style={emptyTextStyle}>No prompt sessions have been created yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {sessions.map((session) => {
            const active = session.prompt_id === selectedPromptId;
            return (
              <button
                key={session.prompt_id}
                type="button"
                title={promptSessionsEntryControlGuide.tooltip}
                onClick={() => onSelect(session.prompt_id)}
                style={{
                  ...sessionButtonStyle,
                  borderColor: active ? "#0969da" : "#d0d7de",
                  background: active ? "#eff6ff" : "#ffffff",
                }}
              >
                <div style={sessionHeaderStyle}>
                  <strong>{session.prompt_id}</strong>
                  <span style={statusStyle}>{session.status}</span>
                </div>
                <div style={promptTextPreviewStyle}>{session.prompt_text}</div>
                <div style={subtleTextStyle}>
                  {session.final_result_summary ?? session.plan_summary ?? "No summary available."}
                </div>
                <div style={subtleTextStyle}>
                  Workspace: {session.workspace_id ?? "none"} | Executor: {session.executor_id ?? "none"}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

const panelStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
  background: "#ffffff",
} satisfies CSSProperties;

const sessionButtonStyle = {
  display: "grid",
  gap: 6,
  width: "100%",
  textAlign: "left" as const,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d0d7de",
  cursor: "pointer",
} satisfies CSSProperties;

const sessionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
} satisfies CSSProperties;

const statusStyle = {
  color: "#57606a",
  textTransform: "capitalize" as const,
} satisfies CSSProperties;

const promptTextPreviewStyle = {
  color: "#24292f",
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "#57606a",
  fontSize: 13,
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "#57606a",
} satisfies CSSProperties;
