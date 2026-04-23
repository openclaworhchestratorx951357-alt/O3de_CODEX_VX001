import { useState, type CSSProperties } from "react";

import type { DesktopShellAgentCallItem } from "./types";

type AgentCallSurfaceProps = {
  agentCallItems: readonly DesktopShellAgentCallItem[];
};

export default function AgentCallSurface({
  agentCallItems,
}: AgentCallSurfaceProps) {
  const [agentCallOpen, setAgentCallOpen] = useState(false);
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [agentChatDraft, setAgentChatDraft] = useState("");
  const visibleAgentCallItems = agentCallItems.length > 0
    ? agentCallItems
    : fallbackAgentCallItems;

  function openChatDock() {
    setAgentChatOpen(true);
    setAgentCallOpen(false);
  }

  return (
    <>
      <div style={agentCallAnchorStyle}>
        <button
          type="button"
          aria-label="Call an agent"
          aria-expanded={agentCallOpen}
          onClick={() => setAgentCallOpen((open) => !open)}
          style={agentCallButtonStyle}
          title="Call an active agent, resume a thread, or start a new chat."
        >
          <span aria-hidden="true">{"\u260E"}</span>
        </button>
        {agentCallOpen ? (
          <div style={agentCallPopoverStyle} role="dialog" aria-label="Agent call menu">
            <div style={agentCallPopoverHeaderStyle}>
              <strong>Call an agent</strong>
              <span>Pick an active helper or start a new chat dock.</span>
            </div>
            <div style={agentCallListStyle}>
              {visibleAgentCallItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={openChatDock}
                  style={agentCallListButtonStyle}
                >
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                  {item.status ? (
                    <small>{item.status}</small>
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openChatDock}
              style={agentCallNewChatButtonStyle}
            >
              Start new chat
            </button>
          </div>
        ) : null}
      </div>

      {agentChatOpen ? (
        <div style={agentChatDockStyle} role="region" aria-label="Agent chat dock">
          <div style={agentChatDockHeaderStyle}>
            <div>
              <strong>Agent chat</strong>
              <span>Ask an agent to help with the current app workspace.</span>
            </div>
            <button
              type="button"
              onClick={() => setAgentChatOpen(false)}
              style={agentChatCloseButtonStyle}
            >
              Close
            </button>
          </div>
          <div style={agentChatFeatureRowStyle} aria-label="Agent feature shortcuts">
            <button type="button" style={agentChatFeatureButtonStyle}>Attach source</button>
            <button type="button" style={agentChatFeatureButtonStyle}>Use current panel</button>
            <button type="button" style={agentChatFeatureButtonStyle}>Open App OS</button>
            <button type="button" style={agentChatFeatureButtonStyle}>Ask O3DE</button>
          </div>
          <form
            style={agentChatInputRowStyle}
            onSubmit={(event) => {
              event.preventDefault();
              setAgentChatDraft("");
            }}
          >
            <input
              value={agentChatDraft}
              onChange={(event) => setAgentChatDraft(event.target.value)}
              placeholder="Tell the agent what to inspect, change, or prepare..."
              style={agentChatInputStyle}
            />
            <button type="submit" aria-label="Send agent message" style={agentChatSendButtonStyle}>
              {"\u2191"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

const fallbackAgentCallItems = [
  {
    id: "mission-control",
    label: "Mission Control",
    detail: "Coordinate tasks, handoffs, and active workspaces.",
    status: "ready",
  },
  {
    id: "operator-guide",
    label: "Guide Agent",
    detail: "Explain the current panel and recommend the next safe step.",
    status: "available",
  },
] satisfies DesktopShellAgentCallItem[];

const agentCallAnchorStyle = {
  position: "relative",
  display: "inline-flex",
} satisfies CSSProperties;

const agentCallButtonStyle = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(255, 130, 130, 0.85)",
  borderRadius: "50%",
  background: "linear-gradient(145deg, #ef4444 0%, #991b1b 100%)",
  color: "#fff7ed",
  boxShadow: "0 14px 34px rgba(153, 27, 27, 0.32)",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
} satisfies CSSProperties;

const agentCallPopoverStyle = {
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  zIndex: 8,
  width: 320,
  display: "grid",
  gap: 12,
  padding: 14,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-window-radius)",
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(22px)",
} satisfies CSSProperties;

const agentCallPopoverHeaderStyle = {
  display: "grid",
  gap: 4,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const agentCallListStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const agentCallListButtonStyle = {
  display: "grid",
  gap: 4,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "10px 12px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  textAlign: "left",
  cursor: "pointer",
} satisfies CSSProperties;

const agentCallNewChatButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "9px 12px",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 800,
} satisfies CSSProperties;

const agentChatDockStyle = {
  position: "fixed",
  left: 18,
  right: 18,
  bottom: 18,
  zIndex: 7,
  display: "grid",
  gap: 10,
  padding: "16px 18px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 28,
  background: "#343638",
  color: "#f4f4f5",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.46)",
  backdropFilter: "blur(26px)",
} satisfies CSSProperties;

const agentChatDockHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  color: "#f4f4f5",
} satisfies CSSProperties;

const agentChatCloseButtonStyle = {
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 12px",
  background: "rgba(255, 255, 255, 0.07)",
  color: "#f4f4f5",
  cursor: "pointer",
} satisfies CSSProperties;

const agentChatFeatureRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const agentChatFeatureButtonStyle = {
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: "var(--app-pill-radius)",
  padding: "9px 12px",
  background: "rgba(255, 255, 255, 0.07)",
  color: "#f4f4f5",
  cursor: "pointer",
  fontWeight: 800,
} satisfies CSSProperties;

const agentChatInputRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
} satisfies CSSProperties;

const agentChatInputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: "var(--app-pill-radius)",
  padding: "13px 16px",
  background: "#2f3133",
  color: "#f4f4f5",
  outline: "none",
  font: "inherit",
} satisfies CSSProperties;

const agentChatSendButtonStyle = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: 0,
  background: "#ffffff",
  color: "#111827",
  cursor: "pointer",
  fontSize: 20,
  fontWeight: 900,
} satisfies CSSProperties;
