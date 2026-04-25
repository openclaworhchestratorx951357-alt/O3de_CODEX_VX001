import type { CSSProperties } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { PromptCapabilityEntry, PromptSessionRecord } from "../types/contracts";
import PanelGuideDetails from "./PanelGuideDetails";
import StatusChip from "./StatusChip";
import {
  getAdmissionTone,
  getAvailabilityTone,
  getCapabilityTone,
  getNaturalLanguageStatusTone,
} from "./statusChipTones";

const promptCapabilitiesGuide = getPanelGuide("prompt-capabilities");
const promptCapabilitiesEntryControlGuide = getPanelControlGuide("prompt-capabilities", "capability-entry");

type PromptCapabilityPanelProps = {
  capabilities: PromptCapabilityEntry[];
  session: PromptSessionRecord | null;
};

export default function PromptCapabilityPanel({
  capabilities,
  session,
}: PromptCapabilityPanelProps) {
  const missingSafetyEnvelopeDetail = "not reported by current backend";
  const missingCapabilityDetail = "not reported by current backend";
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
      <PanelGuideDetails
        tooltip={promptCapabilitiesGuide.tooltip}
        checklist={promptCapabilitiesGuide.checklist}
      />
      {relevantCapabilities.length === 0 ? (
        <p style={emptyTextStyle}>No capability entries are relevant to the current prompt selection.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {relevantCapabilities.map((capability) => {
            const safetyEnvelope = capability.safety_envelope;

            return (
              <article key={capability.tool_name} title={promptCapabilitiesEntryControlGuide.tooltip} style={capabilityCardStyle}>
                <div style={capabilityHeaderStyle}>
                  <strong>{capability.tool_name}</strong>
                  <span style={subtleTextStyle}>{capability.agent_family}</span>
                </div>
                <div style={subtleTextStyle}>Maturity: {capability.capability_maturity}</div>
                <div style={subtleTextStyle}>
                  Capability status:{" "}
                  <StatusChip
                    label={capability.capability_status || missingCapabilityDetail}
                    tone={getCapabilityTone(capability.capability_status)}
                  />
                </div>
                <div style={subtleTextStyle}>
                  Real admission stage:{" "}
                  <StatusChip
                    label={capability.real_admission_stage || missingCapabilityDetail}
                    tone={getAdmissionTone(capability.real_admission_stage)}
                  />
                </div>
                <div style={subtleTextStyle}>
                  Real adapter availability:{" "}
                  <StatusChip
                    label={formatAvailability(capability.real_adapter_availability)}
                    tone={getAvailabilityTone(capability.real_adapter_availability)}
                  />
                </div>
                <div style={subtleTextStyle}>
                  Dry-run availability:{" "}
                  <StatusChip
                    label={formatAvailability(capability.dry_run_availability)}
                    tone={getAvailabilityTone(capability.dry_run_availability)}
                  />
                </div>
                <div style={subtleTextStyle}>
                  Simulation fallback availability:{" "}
                  <StatusChip
                    label={formatAvailability(capability.simulation_fallback_availability)}
                    tone={getAvailabilityTone(capability.simulation_fallback_availability)}
                  />
                </div>
                <div style={subtleTextStyle}>
                  Natural-language status:{" "}
                  <StatusChip
                    label={safetyEnvelope?.natural_language_status ?? missingSafetyEnvelopeDetail}
                    tone={getNaturalLanguageStatusTone(safetyEnvelope?.natural_language_status ?? "")}
                  />
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

function formatAvailability(value: boolean): string {
  return value ? "available" : "not available";
}

const panelStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "var(--app-panel-padding)",
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const capabilityCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  display: "grid",
  gap: 6,
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const capabilityHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
} satisfies CSSProperties;

const blockerTextStyle = {
  color: "var(--app-warning-text)",
  fontSize: 13,
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;
