import type { CSSProperties } from "react";

import type { PromptCapabilityEntry, PromptSessionRecord } from "../types/contracts";

type PromptCapabilityPanelProps = {
  capabilities: PromptCapabilityEntry[];
  session: PromptSessionRecord | null;
};

export default function PromptCapabilityPanel({
  capabilities,
  session,
}: PromptCapabilityPanelProps) {
  const missingSafetyEnvelopeDetail = "not reported by current backend";
  const relevantCapabilities = session
    ? capabilities.filter((capability) => (
      session.admitted_capabilities.includes(capability.tool_name)
      || session.refused_capabilities.includes(capability.tool_name)
    ))
    : capabilities.slice(0, 8);

  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Prompt Capability Registry</h3>
      <p style={subtleTextStyle}>
        The prompt front door can resolve only to admitted catalog capabilities. These entries define the typed tool surface, maturity label, and planning affordances.
      </p>
      {relevantCapabilities.length === 0 ? (
        <p style={emptyTextStyle}>No capability entries are relevant to the current prompt selection.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {relevantCapabilities.map((capability) => {
            const safetyEnvelope = capability.safety_envelope;

            return (
              <article key={capability.tool_name} style={capabilityCardStyle}>
                <div style={capabilityHeaderStyle}>
                  <strong>{capability.tool_name}</strong>
                  <span style={subtleTextStyle}>{capability.agent_family}</span>
                </div>
                <div style={subtleTextStyle}>Maturity: {capability.capability_maturity}</div>
                <div style={subtleTextStyle}>Capability status: {capability.capability_status}</div>
                <div style={subtleTextStyle}>Real admission stage: {capability.real_admission_stage}</div>
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
                    Safety envelope metadata is missing from the current backend payload; prompt-control detail for this capability is incomplete.
                  </div>
                ) : null}
                {safetyEnvelope?.natural_language_blocker ? (
                  <div style={blockerTextStyle}>
                    Blocker: {safetyEnvelope.natural_language_blocker}
                  </div>
                ) : null}
                <div style={subtleTextStyle}>
                  Allowlisted params: {capability.allowlisted_parameter_surfaces.join(", ") || "none"}
                </div>
              </article>
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

const capabilityCardStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const capabilityHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "#57606a",
  fontSize: 13,
} satisfies CSSProperties;

const blockerTextStyle = {
  color: "#9a6700",
  fontSize: 13,
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "#57606a",
} satisfies CSSProperties;
