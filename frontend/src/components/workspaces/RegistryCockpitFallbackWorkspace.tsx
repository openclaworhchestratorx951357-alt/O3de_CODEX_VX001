import type { CSSProperties } from "react";

import DesktopWindow from "../DesktopWindow";
import { getCockpitDefinition } from "../cockpits/registry/cockpitRegistry";
import type { CockpitId } from "../cockpits/registry/cockpitRegistryTypes";

type RegistryCockpitFallbackWorkspaceProps = {
  cockpitId: CockpitId;
  onSelectWorkspace: (workspaceId: string) => void;
};

type PanelZones = {
  top: string[];
  left: string[];
  center: string[];
  right: string[];
  bottom: string[];
};

function createEmptyPanelZones(): PanelZones {
  return {
    top: [],
    left: [],
    center: [],
    right: [],
    bottom: [],
  };
}

export default function RegistryCockpitFallbackWorkspace({
  cockpitId,
  onSelectWorkspace,
}: RegistryCockpitFallbackWorkspaceProps) {
  const definition = getCockpitDefinition(cockpitId);

  if (!definition) {
    return (
      <DesktopWindow
        title="Cockpit unavailable"
        subtitle="No cockpit definition found for this workspace id."
        helpTooltip="Registry fallback workspace"
        guideTitle="Safe next step"
        guideChecklist={[
          "Return to Home and pick a registered cockpit.",
          "Keep execution paths explicit: read-only, plan-only, preflight-only, proof-only, or admitted-real.",
        ]}
      >
        <section style={shellStyle} aria-label="registry fallback cockpit workspace">
          <p style={detailStyle}>
            Workspace id <strong>{cockpitId}</strong> is not registered. This is a safe fallback surface.
          </p>
          <div style={actionRowStyle}>
            <button type="button" onClick={() => onSelectWorkspace("home")} style={buttonStyle}>
              Open Home
            </button>
          </div>
        </section>
      </DesktopWindow>
    );
  }

  const panelZones = definition.panels.reduce<PanelZones>((zones, panel) => {
    zones[panel.zone].push(panel.title);
    return zones;
  }, createEmptyPanelZones());

  return (
    <DesktopWindow
      title={definition.title}
      subtitle={definition.workspaceSubtitle}
      helpTooltip="Definition-driven registry fallback cockpit shell"
      guideTitle="Why this cockpit opened automatically"
      guideChecklist={[
        "This cockpit is registered in metadata and is reachable without additional App.tsx route wiring.",
        "A specialized workspace view is not attached yet; this fallback keeps navigation, truth labels, and safety copy explicit.",
        "Use Prompt Studio for template prefill only; no auto execution is triggered here.",
      ]}
    >
      <section style={shellStyle} aria-label="registry fallback cockpit workspace">
        <article style={cardStyle}>
          <h3 style={headingStyle}>Cockpit identity</h3>
          <p style={detailStyle}><strong>Category:</strong> {definition.category}</p>
          <p style={detailStyle}><strong>Truth state:</strong> {definition.truthState}</p>
          <p style={detailStyle}><strong>Route key:</strong> {definition.routeKey}</p>
          <p style={detailStyle}>{definition.description}</p>
        </article>

        <article style={cardStyle}>
          <h3 style={headingStyle}>Default cockpit panel plan</h3>
          <p style={detailStyle}>top: {panelZones.top.join(", ") || "none"}</p>
          <p style={detailStyle}>left: {panelZones.left.join(", ") || "none"}</p>
          <p style={detailStyle}>center: {panelZones.center.join(", ") || "none"}</p>
          <p style={detailStyle}>right: {panelZones.right.join(", ") || "none"}</p>
          <p style={detailStyle}>bottom: {panelZones.bottom.join(", ") || "none"}</p>
        </article>

        <article style={cardStyle}>
          <h3 style={headingStyle}>Command bar declarations</h3>
          <ul style={listStyle}>
            {definition.commandBar.length > 0 ? definition.commandBar.map((command) => (
              <li key={command.id}>
                <strong>{command.label}</strong> - {command.truthState}
              </li>
            )) : (
              <li>No command declarations.</li>
            )}
          </ul>
        </article>

        <article style={cardStyle}>
          <h3 style={headingStyle}>Prompt templates (prefill-only)</h3>
          <ul style={listStyle}>
            {definition.promptTemplates.length > 0 ? definition.promptTemplates.map((template) => (
              <li key={template.id}>
                <strong>{template.label}</strong> - {template.truthState}; autoExecute=false
              </li>
            )) : (
              <li>No prompt templates declared.</li>
            )}
          </ul>
        </article>

        <article style={cardStyle}>
          <h3 style={headingStyle}>Blocked capabilities</h3>
          <ul style={listStyle}>
            {definition.blockedCapabilities.length > 0 ? definition.blockedCapabilities.map((blocked) => (
              <li key={blocked.id}>
                <strong>{blocked.label}</strong>: {blocked.reason}. Next unlock: {blocked.nextUnlock}.
              </li>
            )) : (
              <li>No blocked capability declarations.</li>
            )}
          </ul>
        </article>

        <div style={actionRowStyle}>
          <button type="button" onClick={() => onSelectWorkspace("prompt")} style={buttonStyle}>
            Open Prompt Studio
          </button>
          <button type="button" onClick={() => onSelectWorkspace("home")} style={buttonStyle}>
            Open Home
          </button>
        </div>
      </section>
    </DesktopWindow>
  );
}

const shellStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const cardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-soft)",
  padding: "12px 14px",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const headingStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.3,
} satisfies CSSProperties;

const detailStyle = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 4,
  color: "var(--app-text-color)",
  fontSize: 13,
  lineHeight: 1.4,
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const buttonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "7px 11px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;
