import type { CSSProperties, ReactNode } from "react";

import DesktopWindow from "../DesktopWindow";
import DockableCockpitLayout from "./DockableCockpitLayout";
import { getCockpitLayoutDefaults } from "./cockpitLayoutDefaults";
import type { CockpitPanelDefinition } from "./cockpitLayoutTypes";

export type CockpitAction = {
  label: string;
  onClick?: () => void;
};

export type CockpitPipelineStep = {
  id: string;
  name: string;
  does: string;
  truthState: string;
  blocker: string;
  nextSafeAction: string;
};

export type CockpitToolCard = {
  id: string;
  title: string;
  truthState: string;
  description: string;
  blocked: string;
  nextSafeAction: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type CockpitPromptTemplate = {
  id: string;
  label: string;
  truthLabels: string;
  promptText: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type CockpitBlockedCapability = {
  id: string;
  label: string;
  reason: string;
  nextUnlock: string;
};

type CockpitWorkspaceShellProps = {
  cockpitId: string;
  title: string;
  subtitle: string;
  truthLabel: string;
  missionPurpose: string;
  commandActions: CockpitAction[];
  pipelineTitle: string;
  pipelineSteps: CockpitPipelineStep[];
  toolCardsTitle: string;
  toolCards: CockpitToolCard[];
  promptTemplates: CockpitPromptTemplate[];
  blockedCapabilities: CockpitBlockedCapability[];
  truthRail?: ReactNode;
  reviewNote: string;
};

export default function CockpitWorkspaceShell({
  cockpitId,
  title,
  subtitle,
  truthLabel,
  missionPurpose,
  commandActions,
  pipelineTitle,
  pipelineSteps,
  toolCardsTitle,
  toolCards,
  promptTemplates,
  blockedCapabilities,
  truthRail,
  reviewNote,
}: CockpitWorkspaceShellProps) {
  const layoutDefaults = getCockpitLayoutDefaults(cockpitId);
  const panelDefinitions: CockpitPanelDefinition[] = [
    {
      id: "identity",
      title: "Cockpit identity",
      subtitle: "Mission purpose and truthful cockpit posture",
      truthState: "status",
      defaultZone: "top",
      collapsible: false,
      scrollMode: "none",
      priority: "status",
      minHeight: 130,
      defaultHeight: 150,
      render: () => (
        <section style={identityCardStyle}>
          <div style={identityHeaderStyle}>
            <strong>{title}</strong>
            <span style={truthBadgeStyle}>{truthLabel}</span>
          </div>
          <p style={detailStyle}><strong>Mission purpose:</strong> {missionPurpose}</p>
        </section>
      ),
    },
    {
      id: "command-bar",
      title: "Command bar",
      subtitle: "Mission-safe launch and navigation actions",
      truthState: "actions",
      defaultZone: "left",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minHeight: 150,
      defaultHeight: 180,
      render: () => (
        <div style={actionRowStyle}>
          {commandActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={!action.onClick}
              style={buttonStyle}
            >
              {action.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: "pipeline",
      title: pipelineTitle,
      subtitle: "Stage-by-stage truth, blockers, and next safe actions",
      truthState: "primary workflow",
      defaultZone: "center",
      collapsible: true,
      scrollMode: "content",
      priority: "primary",
      minHeight: 280,
      defaultHeight: 440,
      render: () => (
        <div style={gridStyle}>
          {pipelineSteps.map((step) => (
            <article key={step.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <strong>{step.name}</strong>
                <span style={truthPillStyle}>{step.truthState}</span>
              </div>
              <p style={detailStyle}><strong>Does:</strong> {step.does}</p>
              <p style={detailStyle}><strong>Blocker:</strong> {step.blocker}</p>
              <p style={detailStyle}><strong>Next safe action:</strong> {step.nextSafeAction}</p>
            </article>
          ))}
        </div>
      ),
    },
    {
      id: "tools",
      title: toolCardsTitle,
      subtitle: "Cockpit tools with explicit boundaries",
      truthState: "tools",
      defaultZone: "left",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minHeight: 240,
      defaultHeight: 360,
      render: () => (
        <div style={gridStyle}>
          {toolCards.map((card) => (
            <article key={card.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <strong>{card.title}</strong>
                <span style={truthPillStyle}>{card.truthState}</span>
              </div>
              <p style={detailStyle}>{card.description}</p>
              <p style={detailStyle}><strong>Blocked/allowed:</strong> {card.blocked}</p>
              <p style={detailStyle}><strong>Next safe action:</strong> {card.nextSafeAction}</p>
              {card.actionLabel ? (
                <button
                  type="button"
                  onClick={card.onAction}
                  disabled={!card.onAction}
                  style={primaryButtonStyle}
                >
                  {card.actionLabel}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ),
    },
    {
      id: "prompt-templates",
      title: "Suggested prompt templates",
      subtitle: "Prefill-only templates; no auto execution",
      truthState: "evidence",
      defaultZone: "bottom",
      collapsible: true,
      scrollMode: "content",
      priority: "evidence",
      minHeight: 180,
      defaultHeight: 240,
      render: () => (
        <div style={templateGridStyle}>
          {promptTemplates.map((template) => (
            <article key={template.id} style={templateCardStyle}>
              <strong>{template.label}</strong>
              <p style={detailStyle}><strong>Truth label:</strong> {template.truthLabels}</p>
              <pre style={templateBodyStyle}>{template.promptText}</pre>
              {template.actionLabel ? (
                <button
                  type="button"
                  onClick={template.onAction}
                  disabled={!template.onAction}
                  style={primaryButtonStyle}
                >
                  {template.actionLabel}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ),
    },
    {
      id: "blocked-capabilities",
      title: "Blocked capabilities and future unlocks",
      subtitle: "Explicit boundary posture with next gate clarity",
      truthState: "blocked",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minHeight: 220,
      defaultHeight: 320,
      render: () => (
        <ul style={listStyle}>
          {blockedCapabilities.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>: {item.reason}. Next unlock: {item.nextUnlock}.
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "review-note",
      title: "Review note",
      subtitle: "Operator safety reminder",
      truthState: "status",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "none",
      priority: "status",
      minHeight: 110,
      defaultHeight: 120,
      render: () => (
        <p style={detailStyle}><strong>Review note:</strong> {reviewNote}</p>
      ),
    },
  ];

  if (truthRail) {
    panelDefinitions.push({
      id: "mission-truth-rail",
      title: "Mission truth rail",
      subtitle: "Live safety and evidence posture",
      truthState: "status/evidence",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minHeight: 220,
      defaultHeight: 320,
      render: () => truthRail,
    });
  }

  return (
    <DesktopWindow
      title={title}
      subtitle={subtitle}
      helpTooltip="Mission cockpit workspace"
      guideTitle="How to use this cockpit"
      guideChecklist={[
        "Arrange panels with presets, reset, collapse, and move controls.",
        "Use resizer handles to tune the workspace and keep scroll contained per panel.",
        "Execute only through admitted or proof-only corridors after prompt preview.",
      ]}
    >
      <DockableCockpitLayout
        cockpitId={cockpitId}
        panels={panelDefinitions}
        defaultPresetId={layoutDefaults.presetId}
        splitConstraints={layoutDefaults.splitConstraints}
      />
    </DesktopWindow>
  );
}

const identityCardStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const identityHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const truthBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "2px 9px",
  fontSize: 11,
  textTransform: "uppercase",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const cardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  padding: 10,
  display: "grid",
  gap: 8,
  background: "var(--app-panel-bg-muted)",
  minWidth: 0,
  minHeight: 0,
} satisfies CSSProperties;

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const truthPillStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  textTransform: "uppercase",
} satisfies CSSProperties;

const templateGridStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const templateCardStyle = {
  border: "1px solid rgba(173, 204, 238, 0.55)",
  borderRadius: 10,
  background: "rgba(24, 40, 62, 0.45)",
  padding: 10,
  display: "grid",
  gap: 8,
  minWidth: 0,
  minHeight: 0,
} satisfies CSSProperties;

const templateBodyStyle = {
  margin: 0,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  fontSize: 12,
  minWidth: 0,
} satisfies CSSProperties;

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 6,
  minWidth: 0,
} satisfies CSSProperties;

const detailStyle = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const buttonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "6px 10px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid #5faeff",
  borderRadius: 8,
  padding: "7px 10px",
  background: "var(--app-panel-elevated)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 700,
} satisfies CSSProperties;
