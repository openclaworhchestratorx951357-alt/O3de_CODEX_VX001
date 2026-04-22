import type { CSSProperties } from "react";

import { operatorGuideCatalog } from "../content/operatorGuide";

export default function OperatorGuidePanel() {
  return (
    <div style={panelStyle}>
      <section style={heroCardStyle}>
        <span style={eyebrowStyle}>Operator Guide</span>
        <div style={heroHeaderStyle}>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={heroTitleStyle}>Use the desktop with the UI and docs in sync</h2>
            <p style={heroBodyStyle}>{operatorGuideCatalog.app.summary}</p>
          </div>
          <div style={pillClusterStyle}>
            <span style={infoPillStyle}>
              Canonical backend: {operatorGuideCatalog.app.canonicalBackend}
            </span>
            <span style={successPillStyle}>
              Admitted real: {operatorGuideCatalog.app.admittedRealTools.join(", ")}
            </span>
            <span style={warningPillStyle}>
              Still simulated: {operatorGuideCatalog.app.simulatedOnlyFocusTools.join(", ")}
            </span>
          </div>
        </div>

        <div style={guideGridStyle}>
          <article style={miniCardStyle}>
            <strong style={miniCardTitleStyle}>How to move through the app</strong>
            <ol style={orderedListStyle}>
              {operatorGuideCatalog.app.operatorFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article style={miniCardStyle}>
            <strong style={miniCardTitleStyle}>Tooltip coverage</strong>
            <p style={miniCardBodyStyle}>{operatorGuideCatalog.app.tooltipGuidance}</p>
            <ul style={listStyle}>
              {operatorGuideCatalog.quickStats.map((quickStat) => (
                <li key={quickStat.id}>
                  <strong>{quickStat.label}:</strong> {quickStat.tooltip}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section style={stackStyle}>
        <article style={workspaceCardStyle}>
          <div style={workspaceHeaderStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={eyebrowStyle}>Admitted Real Proof</span>
              <h3 style={workspaceTitleStyle}>Operator proof checklist for canonical 127.0.0.1:8000</h3>
              <p style={workspaceSummaryStyle}>
                Use this repo-owned proof flow and its evidence checks to confirm admitted-real
                editor.session.open, editor.level.open, and narrow editor.entity.create on the
                canonical backend while keeping editor.component.add simulated-only.
              </p>
            </div>
          </div>

          <div style={workspaceGridStyle}>
            {operatorGuideCatalog.proofChecklist.map((check) => (
              <article key={check.id} style={surfaceCardStyle}>
                <strong style={surfaceTitleStyle}>{check.title}</strong>
                <p style={surfaceTooltipStyle}>{check.summary}</p>

                <div style={workspaceSectionStyle}>
                  <strong style={sectionTitleStyle}>Endpoints</strong>
                  <ul style={listStyle}>
                    {check.endpoints.map((endpoint) => (
                      <li key={endpoint}>
                        <code>{endpoint}</code>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={workspaceSectionStyle}>
                  <strong style={sectionTitleStyle}>Commands</strong>
                  <div style={commandStackStyle}>
                    {check.commands.map((command) => (
                      <pre key={command} style={commandBlockStyle}>
                        <code>{command}</code>
                      </pre>
                    ))}
                  </div>
                </div>

                <div style={workspaceSectionStyle}>
                  <strong style={sectionTitleStyle}>Evidence to confirm</strong>
                  <ul style={listStyle}>
                    {check.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section style={stackStyle}>
        {operatorGuideCatalog.workspaces.map((workspace) => (
          <article key={workspace.id} style={workspaceCardStyle}>
            <div style={workspaceHeaderStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={eyebrowStyle}>{workspace.navLabel}</span>
                <h3 style={workspaceTitleStyle}>{workspace.workspaceTitle}</h3>
                <p style={workspaceSummaryStyle}>{workspace.guideSummary}</p>
              </div>
              <div style={pillClusterStyle}>
                <span style={infoPillStyle}>{workspace.navSubtitle}</span>
                <span style={neutralPillStyle}>{workspace.tooltip}</span>
              </div>
            </div>

            <div style={guideGridStyle}>
              <article style={miniCardStyle}>
                <strong style={miniCardTitleStyle}>Operator checklist</strong>
                <ul style={listStyle}>
                  {workspace.operatorChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              {workspace.launchpad ? (
                <article style={miniCardStyle}>
                  <strong style={miniCardTitleStyle}>Launchpad shortcut</strong>
                  <p style={miniCardBodyStyle}>
                    <strong>{workspace.launchpad.label}:</strong> {workspace.launchpad.description}
                  </p>
                  <p style={miniCardBodyStyle}>{workspace.launchpad.tooltip}</p>
                </article>
              ) : null}
            </div>

            <div style={workspaceSectionStyle}>
              <strong style={sectionTitleStyle}>Windows</strong>
              <div style={workspaceGridStyle}>
                {workspace.windows.map((window) => (
                  <article key={window.id} style={surfaceCardStyle}>
                    <strong style={surfaceTitleStyle}>{window.title}</strong>
                    <span style={surfaceSubtitleStyle}>{window.subtitle}</span>
                    <p style={surfaceTooltipStyle}>{window.tooltip}</p>
                    <ul style={listStyle}>
                      {window.instructions.map((instruction) => (
                        <li key={instruction}>{instruction}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            {workspace.surfaces && workspace.surfaces.length > 0 ? (
              <div style={workspaceSectionStyle}>
                <strong style={sectionTitleStyle}>Surfaces and tabs</strong>
                <div style={workspaceGridStyle}>
                  {workspace.surfaces.map((surface) => (
                    <article key={surface.id} style={surfaceCardStyle}>
                      <strong style={surfaceTitleStyle}>{surface.label}</strong>
                      <span style={surfaceSubtitleStyle}>{surface.detail}</span>
                      <p style={surfaceTooltipStyle}>{surface.tooltip}</p>
                      <ul style={listStyle}>
                        {surface.instructions.map((instruction) => (
                          <li key={instruction}>{instruction}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section style={stackStyle}>
        <article style={workspaceCardStyle}>
          <div style={workspaceHeaderStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={eyebrowStyle}>Key Panels</span>
              <h3 style={workspaceTitleStyle}>Panel-level instructions and control tips</h3>
              <p style={workspaceSummaryStyle}>
                These are the first inner operator panels wired back to the shared guide source.
                Their help disclosures, control tooltips, and generated docs now stay aligned.
              </p>
            </div>
          </div>

          <div style={workspaceGridStyle}>
            {operatorGuideCatalog.panels.map((panel) => (
              <article key={panel.id} style={surfaceCardStyle}>
                <strong style={surfaceTitleStyle}>{panel.title}</strong>
                <span style={surfaceSubtitleStyle}>{panel.locationLabel}</span>
                <p style={surfaceTooltipStyle}>{panel.tooltip}</p>
                <ul style={listStyle}>
                  {panel.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <strong style={sectionTitleStyle}>Control tips</strong>
                <ul style={listStyle}>
                  {panel.controls.map((control) => (
                    <li key={control.id}>
                      <strong>{control.label}:</strong> {control.tooltip}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section style={guideGridStyle}>
        <article style={miniCardStyle}>
          <strong style={miniCardTitleStyle}>Truth posture</strong>
          <ul style={listStyle}>
            {operatorGuideCatalog.app.truthNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>

        <article style={miniCardStyle}>
          <strong style={miniCardTitleStyle}>Keep the guide current</strong>
          <p style={miniCardBodyStyle}>
            Generated document path: <code>docs/APP-OPERATOR-GUIDE.md</code>
          </p>
          <ul style={listStyle}>
            {operatorGuideCatalog.app.maintenance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

const panelStyle = {
  display: "grid",
  gap: 18,
} satisfies CSSProperties;

const heroCardStyle = {
  display: "grid",
  gap: 18,
  padding: 22,
  borderRadius: "var(--app-window-radius)",
  background: "linear-gradient(140deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  border: "1px solid var(--app-panel-border-strong)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const heroHeaderStyle = {
  display: "grid",
  gap: 14,
} satisfies CSSProperties;

const eyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const heroTitleStyle = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.1,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const heroBodyStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.6,
  fontSize: 14,
} satisfies CSSProperties;

const stackStyle = {
  display: "grid",
  gap: 16,
} satisfies CSSProperties;

const workspaceCardStyle = {
  display: "grid",
  gap: 16,
  padding: 18,
  borderRadius: "var(--app-window-radius)",
  background: "var(--app-panel-bg-alt)",
  border: "1px solid var(--app-panel-border)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const workspaceHeaderStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const workspaceTitleStyle = {
  margin: 0,
  fontSize: 21,
  lineHeight: 1.15,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const workspaceSummaryStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.6,
} satisfies CSSProperties;

const workspaceSectionStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const sectionTitleStyle = {
  color: "var(--app-text-color)",
  fontSize: 14,
} satisfies CSSProperties;

const guideGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  alignItems: "start",
} satisfies CSSProperties;

const workspaceGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
} satisfies CSSProperties;

const miniCardStyle = {
  display: "grid",
  gap: 10,
  padding: 16,
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg-muted)",
  border: "1px solid var(--app-panel-border)",
} satisfies CSSProperties;

const miniCardTitleStyle = {
  color: "var(--app-text-color)",
  fontSize: 15,
} satisfies CSSProperties;

const miniCardBodyStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.55,
  fontSize: 13,
} satisfies CSSProperties;

const surfaceCardStyle = {
  display: "grid",
  gap: 8,
  padding: 16,
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg)",
  border: "1px solid var(--app-panel-border)",
  alignSelf: "start",
} satisfies CSSProperties;

const surfaceTitleStyle = {
  color: "var(--app-text-color)",
  fontSize: 15,
} satisfies CSSProperties;

const surfaceSubtitleStyle = {
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
  fontSize: 13,
} satisfies CSSProperties;

const surfaceTooltipStyle = {
  margin: 0,
  color: "var(--app-text-color)",
  lineHeight: 1.55,
  fontSize: 13,
} satisfies CSSProperties;

const pillClusterStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const pillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 11px",
  borderRadius: "var(--app-pill-radius)",
  border: "1px solid var(--app-panel-border)",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;

const neutralPillStyle = {
  ...pillStyle,
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const infoPillStyle = {
  ...pillStyle,
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const successPillStyle = {
  ...pillStyle,
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
  borderColor: "var(--app-success-border)",
} satisfies CSSProperties;

const warningPillStyle = {
  ...pillStyle,
  background: "var(--app-warning-bg)",
  color: "var(--app-warning-text)",
  borderColor: "var(--app-warning-border)",
} satisfies CSSProperties;

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "var(--app-muted-color)",
  lineHeight: 1.6,
  fontSize: 13,
} satisfies CSSProperties;

const orderedListStyle = {
  ...listStyle,
  paddingLeft: 20,
} satisfies CSSProperties;

const commandStackStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const commandBlockStyle = {
  margin: 0,
  padding: 12,
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-command-bg)",
  color: "var(--app-command-text)",
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
} satisfies CSSProperties;
