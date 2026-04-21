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
                  borderColor: active ? "var(--app-accent)" : "var(--app-panel-border)",
                  background: active ? "var(--app-accent-soft)" : "var(--app-panel-bg)",
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
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "var(--app-panel-padding)",
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const sessionButtonStyle = {
  display: "grid",
  gap: 6,
  width: "100%",
  textAlign: "left" as const,
  padding: 12,
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  cursor: "pointer",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const sessionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
} satisfies CSSProperties;

const statusStyle = {
  color: "var(--app-muted-color)",
  textTransform: "capitalize" as const,
} satisfies CSSProperties;

const promptTextPreviewStyle = {
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;
