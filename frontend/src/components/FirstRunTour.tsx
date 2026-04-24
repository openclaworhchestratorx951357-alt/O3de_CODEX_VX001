import { useState, type CSSProperties } from "react";

type FirstRunTourStep = {
  workspaceId: string;
  workspaceLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  checklist: readonly string[];
};

type FirstRunTourProps = {
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onComplete: () => void;
};

const TOUR_STEPS: readonly FirstRunTourStep[] = [
  {
    workspaceId: "home",
    workspaceLabel: "Home",
    eyebrow: "Step 1 of 4",
    title: "Start from Home",
    body: "Home keeps the first decision calm. Use it to see recommended next steps, quick health signals, and the safest place to begin.",
    checklist: [
      "Review Recommended next steps before opening deeper panels.",
      "Use Launchpad cards when you know the workspace you need.",
      "Leave Guided mode on while learning the control surface.",
    ],
  },
  {
    workspaceId: "prompt",
    workspaceLabel: "Prompt Studio",
    eyebrow: "Step 2 of 4",
    title: "Use Prompt Studio for natural language",
    body: "Prompt Studio turns plain-language intent into governed plans and approval-gated tool execution without hiding real versus simulated truth.",
    checklist: [
      "Preview plans before executing them.",
      "Confirm project and engine roots before real editor work.",
      "Use approvals instead of bypassing safety gates.",
    ],
  },
  {
    workspaceId: "builder",
    workspaceLabel: "Builder",
    eyebrow: "Step 3 of 4",
    title: "Coordinate threads in Builder",
    body: "Builder is where worktree lanes, mission-control tasks, managed terminals, and helper-thread inboxes live together.",
    checklist: [
      "Create or review a lane before assigning work.",
      "Use recommendations to fill practical Builder templates.",
      "Keep active terminals visible and stop stale ones quickly.",
    ],
  },
  {
    workspaceId: "runtime",
    workspaceLabel: "Runtime",
    eyebrow: "Step 4 of 4",
    title: "Check Runtime when truth matters",
    body: "Runtime shows bridge health, persistence, adapters, policies, and the evidence that tells you whether O3DE-backed paths are really ready.",
    checklist: [
      "Start with System Status and recommendations.",
      "Open advanced truth details only when deeper evidence is needed.",
      "Use Records after work runs to inspect persisted evidence.",
    ],
  },
];

export default function FirstRunTour({
  activeWorkspaceId,
  onSelectWorkspace,
  onComplete,
}: FirstRunTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = TOUR_STEPS[stepIndex];
  const previousStep = TOUR_STEPS[stepIndex - 1] ?? null;
  const nextStep = TOUR_STEPS[stepIndex + 1] ?? null;
  const currentWorkspaceOpen = activeWorkspaceId === activeStep.workspaceId;

  function goToStep(nextIndex: number): void {
    const nextTourStep = TOUR_STEPS[nextIndex];
    if (!nextTourStep) {
      return;
    }

    setStepIndex(nextIndex);
    onSelectWorkspace(nextTourStep.workspaceId);
  }

  return (
    <aside
      aria-label="First-run guided tour"
      role="dialog"
      style={tourShellStyle}
    >
      <div style={tourHeaderStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <span style={eyebrowStyle}>{activeStep.eyebrow}</span>
          <strong style={titleStyle}>{activeStep.title}</strong>
        </div>
        <button
          type="button"
          onClick={onComplete}
          style={quietButtonStyle}
        >
          Skip
        </button>
      </div>

      <p style={bodyStyle}>{activeStep.body}</p>

      <ol style={checklistStyle}>
        {activeStep.checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>

      <div style={progressRowStyle} aria-label="Tour progress">
        {TOUR_STEPS.map((step, index) => (
          <span
            key={step.workspaceId}
            title={step.title}
            style={{
              ...progressDotStyle,
              ...(index === stepIndex ? progressDotActiveStyle : null),
            }}
          />
        ))}
      </div>

      <div style={actionRowStyle}>
        <button
          type="button"
          onClick={() => onSelectWorkspace(activeStep.workspaceId)}
          disabled={currentWorkspaceOpen}
          style={secondaryButtonStyle}
        >
          {currentWorkspaceOpen ? "Workspace open" : `Open ${activeStep.workspaceLabel}`}
        </button>
        <button
          type="button"
          onClick={() => previousStep ? goToStep(stepIndex - 1) : undefined}
          disabled={!previousStep}
          style={secondaryButtonStyle}
        >
          Back
        </button>
        {nextStep ? (
          <button
            type="button"
            onClick={() => goToStep(stepIndex + 1)}
            style={primaryButtonStyle}
          >
            Next: {nextStep.workspaceLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            style={primaryButtonStyle}
          >
            Finish tour
          </button>
        )}
      </div>
    </aside>
  );
}

const tourShellStyle = {
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 950,
  width: "min(430px, calc(100vw - 32px))",
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: "var(--app-window-radius)",
  border: "1px solid var(--app-panel-border-strong)",
  background: "linear-gradient(145deg, var(--app-panel-bg-alt) 0%, var(--app-panel-bg) 100%)",
  boxShadow: "var(--app-shadow-strong)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const tourHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
} satisfies CSSProperties;

const eyebrowStyle = {
  display: "block",
  marginBottom: 4,
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  lineHeight: 1.2,
} satisfies CSSProperties;

const titleStyle = {
  fontSize: 18,
  lineHeight: 1.15,
} satisfies CSSProperties;

const bodyStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.55,
} satisfies CSSProperties;

const checklistStyle = {
  margin: 0,
  paddingLeft: 22,
  color: "var(--app-text-color)",
  lineHeight: 1.55,
} satisfies CSSProperties;

const progressRowStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
} satisfies CSSProperties;

const progressDotStyle = {
  width: 9,
  height: 9,
  borderRadius: "50%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const progressDotActiveStyle = {
  width: 26,
  borderRadius: "var(--app-pill-radius)",
  borderColor: "var(--app-accent-strong)",
  background: "var(--app-accent)",
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const quietButtonStyle = {
  border: "1px solid transparent",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 10px",
  background: "transparent",
  color: "var(--app-muted-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 14px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  cursor: "pointer",
} satisfies CSSProperties;
