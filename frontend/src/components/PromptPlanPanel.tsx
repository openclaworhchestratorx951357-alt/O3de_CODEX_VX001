import type { CSSProperties } from "react";

import type { PromptSessionRecord } from "../types/contracts";

type PromptPlanPanelProps = {
  session: PromptSessionRecord | null;
};

export default function PromptPlanPanel({ session }: PromptPlanPanelProps) {
  const missingSafetyEnvelopeDetail = "not reported by current backend";

  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Prompt Plan</h3>
      {!session ? (
        <p style={emptyTextStyle}>Select a prompt session to inspect its admitted plan.</p>
      ) : !session.plan ? (
        <p style={emptyTextStyle}>This prompt session does not have a persisted plan.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={summaryCardStyle}>
            <div><strong>Admitted:</strong> {session.plan.admitted ? "yes" : "no"}</div>
            <div><strong>Summary:</strong> {session.plan.summary}</div>
            <div><strong>Refusal reason:</strong> {session.plan.refusal_reason ?? "none"}</div>
          </div>
          {session.plan.capability_requirements.length > 0 ? (
            <div>
              <strong>Capability requirements</strong>
              <ul style={listStyle}>
                {session.plan.capability_requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {session.plan.refused_capabilities.length > 0 ? (
            <div>
              <strong>Refused capabilities</strong>
              <ul style={listStyle}>
                {session.plan.refused_capabilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <strong>Typed steps</strong>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {session.plan.steps.map((step) => {
                const safetyEnvelope = step.safety_envelope;

                return (
                  <article key={step.step_id} style={stepCardStyle}>
                    <div style={stepHeaderStyle}>
                      <strong>{step.step_id}</strong>
                      <span>{step.tool}</span>
                    </div>
                    <div style={subtleTextStyle}>Agent: {step.agent}</div>
                    <div style={subtleTextStyle}>Approval: {step.approval_class}</div>
                    <div style={subtleTextStyle}>Capability status: {step.capability_status_required}</div>
                    <div style={subtleTextStyle}>Maturity: {step.capability_maturity}</div>
                    <div style={subtleTextStyle}>
                      Natural-language status: {safetyEnvelope?.natural_language_status ?? missingSafetyEnvelopeDetail}
                    </div>
                    <div style={subtleTextStyle}>
                      State scope: {safetyEnvelope?.state_scope ?? missingSafetyEnvelopeDetail}
                    </div>
                    <div style={subtleTextStyle}>
                      Backup / rollback: {safetyEnvelope?.backup_class ?? missingSafetyEnvelopeDetail} / {safetyEnvelope?.rollback_class ?? missingSafetyEnvelopeDetail}
                    </div>
                    <div style={subtleTextStyle}>
                      Verification / retention: {safetyEnvelope?.verification_class ?? missingSafetyEnvelopeDetail} / {safetyEnvelope?.retention_class ?? missingSafetyEnvelopeDetail}
                    </div>
                    {!safetyEnvelope ? (
                      <div style={blockerTextStyle}>
                        Safety envelope metadata is missing from the current backend payload; prompt-plan detail for this step is incomplete.
                      </div>
                    ) : null}
                    {safetyEnvelope?.natural_language_blocker ? (
                      <div style={blockerTextStyle}>
                        Blocker: {safetyEnvelope.natural_language_blocker}
                      </div>
                    ) : null}
                    <div style={subtleTextStyle}>
                      Execution truth: {step.simulated_allowed ? "simulated allowed" : "real path preferred"}
                    </div>
                    {step.depends_on.length > 0 ? (
                      <div style={subtleTextStyle}>Depends on: {step.depends_on.join(", ")}</div>
                    ) : null}
                    <pre style={argsStyle}>{JSON.stringify(step.args, null, 2)}</pre>
                  </article>
                );
              })}
            </div>
          </div>
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

const summaryCardStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  background: "#f6f8fa",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const stepCardStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const stepHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
} satisfies CSSProperties;

const argsStyle = {
  margin: 0,
  padding: 12,
  borderRadius: 8,
  background: "#f6f8fa",
  overflowX: "auto" as const,
  fontSize: 12,
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "#57606a",
  fontSize: 13,
} satisfies CSSProperties;

const blockerTextStyle = {
  color: "#9a6700",
  fontSize: 13,
} satisfies CSSProperties;

const listStyle = {
  margin: "8px 0 0 0",
  paddingLeft: 18,
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "#57606a",
} satisfies CSSProperties;
