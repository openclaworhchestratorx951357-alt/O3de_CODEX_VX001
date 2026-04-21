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
              Excluded: {operatorGuideCatalog.app.excludedTools.join(", ")}
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
                Use these exact commands, endpoints, and evidence checks to confirm admitted-real
                editor.session.open and editor.level.open while keeping editor.entity.create
                explicitly excluded.
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
  borderRadius: 24,
  background: "linear-gradient(140deg, rgba(229, 239, 255, 0.98) 0%, rgba(248, 251, 255, 0.96) 100%)",
  border: "1px solid rgba(103, 132, 184, 0.22)",
  boxShadow: "0 20px 44px rgba(45, 76, 133, 0.12)",
} satisfies CSSProperties;

const heroHeaderStyle = {
  display: "grid",
  gap: 14,
} satisfies CSSProperties;

const eyebrowStyle = {
  color: "#55719f",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const heroTitleStyle = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.1,
  color: "#10203a",
} satisfies CSSProperties;

const heroBodyStyle = {
  margin: 0,
  color: "#48617f",
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
  borderRadius: 22,
  background: "rgba(252, 253, 255, 0.94)",
  border: "1px solid rgba(135, 157, 201, 0.18)",
  boxShadow: "0 16px 32px rgba(58, 84, 136, 0.08)",
} satisfies CSSProperties;

const workspaceHeaderStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const workspaceTitleStyle = {
  margin: 0,
  fontSize: 21,
  lineHeight: 1.15,
  color: "#13233c",
} satisfies CSSProperties;

const workspaceSummaryStyle = {
  margin: 0,
  color: "#4d6588",
  lineHeight: 1.6,
} satisfies CSSProperties;

const workspaceSectionStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const sectionTitleStyle = {
  color: "#193055",
  fontSize: 14,
} satisfies CSSProperties;

const guideGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
} satisfies CSSProperties;

const workspaceGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const miniCardStyle = {
  display: "grid",
  gap: 10,
  padding: 16,
  borderRadius: 18,
  background: "rgba(242, 247, 255, 0.9)",
  border: "1px solid rgba(137, 156, 196, 0.18)",
} satisfies CSSProperties;

const miniCardTitleStyle = {
  color: "#173055",
  fontSize: 15,
} satisfies CSSProperties;

const miniCardBodyStyle = {
  margin: 0,
  color: "#526987",
  lineHeight: 1.55,
  fontSize: 13,
} satisfies CSSProperties;

const surfaceCardStyle = {
  display: "grid",
  gap: 8,
  padding: 16,
  borderRadius: 18,
  background: "rgba(248, 251, 255, 0.96)",
  border: "1px solid rgba(135, 157, 201, 0.18)",
} satisfies CSSProperties;

const surfaceTitleStyle = {
  color: "#153056",
  fontSize: 15,
} satisfies CSSProperties;

const surfaceSubtitleStyle = {
  color: "#56719a",
  lineHeight: 1.45,
  fontSize: 13,
} satisfies CSSProperties;

const surfaceTooltipStyle = {
  margin: 0,
  color: "#233c61",
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
  borderRadius: 999,
  border: "1px solid rgba(117, 128, 154, 0.18)",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;

const neutralPillStyle = {
  ...pillStyle,
  background: "rgba(242, 247, 255, 0.84)",
  color: "#304565",
} satisfies CSSProperties;

const infoPillStyle = {
  ...pillStyle,
  background: "rgba(224, 241, 255, 0.82)",
  color: "#0e4c92",
} satisfies CSSProperties;

const successPillStyle = {
  ...pillStyle,
  background: "rgba(227, 248, 239, 0.84)",
  color: "#0f6b47",
} satisfies CSSProperties;

const warningPillStyle = {
  ...pillStyle,
  background: "rgba(255, 244, 224, 0.88)",
  color: "#8a4d00",
} satisfies CSSProperties;

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "#415a79",
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
  borderRadius: 14,
  background: "#10203a",
  color: "#e7f0ff",
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
} satisfies CSSProperties;
