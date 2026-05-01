import { useMemo, type CSSProperties, type ReactNode } from "react";

import DockableCockpitLayout from "../cockpits/DockableCockpitLayout";
import { getCockpitLayoutDefaults } from "../cockpits/cockpitLayoutDefaults";
import type { CockpitPanelDefinition } from "../cockpits/cockpitLayoutTypes";
import { getWorkspaceWindowGuide } from "../../content/operatorGuide";

type PromptWorkspaceViewProps = {
  content: ReactNode;
};

const promptStudioWindow = getWorkspaceWindowGuide("prompt", "prompt-studio");

export default function PromptWorkspaceView({
  content,
}: PromptWorkspaceViewProps) {
  const layoutDefaults = getCockpitLayoutDefaults("prompt");
  const panels = useMemo<CockpitPanelDefinition[]>(() => ([
    {
      id: "prompt-command-strip",
      title: "Prompt command strip",
      subtitle: "Prompt lane posture and mission-safe usage notes",
      truthState: "prefill-only / review-first",
      defaultZone: "top",
      collapsible: false,
      scrollMode: "none",
      priority: "tools",
      minHeight: 90,
      defaultHeight: 108,
      render: () => (
        <section style={promptStripStackStyle}>
          <div style={promptStripTitleGroupStyle}>
            <strong>{promptStudioWindow.title}</strong>
            <span style={promptStripSubtitleStyle}>{promptStudioWindow.subtitle}</span>
          </div>
          <div style={promptStripStyle}>
            <span style={promptStripChipStyle}>Prompt Studio cockpit</span>
            <span style={promptStripChipStyle}>No auto-execution</span>
            <span style={promptStripChipStyle}>Preview and approval remain required</span>
          </div>
        </section>
      ),
    },
    {
      id: "prompt-tools-outliner",
      title: "Prompt tools and outliner",
      subtitle: "Left rail for lane orientation and safest next action reminders",
      truthState: "read-only navigation",
      defaultZone: "left",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minWidth: 240,
      minHeight: 230,
      defaultHeight: 320,
      render: () => (
        <section style={promptCardStackStyle}>
          <article style={promptCardStyle}>
            <strong>Lane flow</strong>
            <ol style={promptListStyle}>
              <li>Pick or prefill a mission prompt draft.</li>
              <li>Review plan and safety labels before execution.</li>
              <li>Use approval flow when required by policy.</li>
              <li>Review records and runtime evidence after completion.</li>
            </ol>
          </article>
        </section>
      ),
    },
    {
      id: "prompt-work-area",
      title: "Prompt dominant work area",
      subtitle: "Center workspace for prompt drafting, review, and governed execution planning",
      truthState: "active surface",
      defaultZone: "center",
      collapsible: true,
      scrollMode: "content",
      priority: "primary",
      minWidth: 520,
      minHeight: 360,
      defaultHeight: 580,
      render: () => content,
    },
    {
      id: "prompt-inspector-truth",
      title: "Inspector and truth",
      subtitle: "Right lane for safety constraints and blocked execution reminders",
      truthState: "blocked / review",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minWidth: 280,
      minHeight: 230,
      defaultHeight: 320,
      render: () => (
        <section style={promptCardStackStyle}>
          <article style={promptCardStyle}>
            <strong>Truth posture</strong>
            <ul style={promptListStyle}>
              <li>Auto execution is blocked.</li>
              <li>Prompt preview remains operator-visible.</li>
              <li>Approval gates remain enforced.</li>
              <li>Runtime mutation policy remains unchanged.</li>
            </ul>
          </article>
        </section>
      ),
    },
    {
      id: "prompt-evidence-drawer",
      title: "Evidence and templates drawer",
      subtitle: "Bottom drawer for prompt context and cross-cockpit review reminders",
      truthState: "evidence / handoff",
      defaultZone: "bottom",
      collapsible: true,
      scrollMode: "content",
      priority: "evidence",
      minHeight: 170,
      defaultHeight: 210,
      render: () => (
        <section style={promptCardStackStyle}>
          <article style={promptCardStyle}>
            <strong>Evidence reminder</strong>
            <p style={promptDetailStyle}>
              Use Prompt Studio to prepare and inspect bounded prompts, then confirm run/execution/artifact evidence in Records.
            </p>
          </article>
        </section>
      ),
    },
  ]), [content]);

  return (
    <DockableCockpitLayout
      cockpitId="prompt"
      panels={panels}
      defaultPresetId={layoutDefaults.presetId}
      splitConstraints={layoutDefaults.splitConstraints}
    />
  );
}

const promptStripStackStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const promptStripTitleGroupStyle = {
  display: "grid",
  gap: 2,
} satisfies CSSProperties;

const promptStripSubtitleStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 12,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const promptStripStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const promptStripChipStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  background: "var(--app-panel-bg-alt)",
} satisfies CSSProperties;

const promptCardStackStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const promptCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  padding: "10px 11px",
  background: "var(--app-panel-bg-alt)",
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const promptListStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;

const promptDetailStyle = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;
