import type { CSSProperties } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { PromptCapabilityEntry, PromptSessionRecord } from "../types/contracts";
import PanelGuideDetails from "./PanelGuideDetails";
import StatusChip from "./StatusChip";
import {
  getAdmissionTone,
  getAvailabilityTone,
  getCapabilityTone,
  getExecutionTruthTone,
  getNaturalLanguageStatusTone,
} from "./statusChipTones";

const promptPlanGuide = getPanelGuide("prompt-plan");
const promptPlanSummaryControlGuide = getPanelControlGuide("prompt-plan", "plan-summary");
const promptPlanStepControlGuide = getPanelControlGuide("prompt-plan", "step-card");
const promptPlanArgsControlGuide = getPanelControlGuide("prompt-plan", "args-json");

type PromptPlanPanelProps = {
  session: PromptSessionRecord | null;
  capabilities?: PromptCapabilityEntry[];
};

export default function PromptPlanPanel({
  session,
  capabilities = [],
}: PromptPlanPanelProps) {
  const missingSafetyEnvelopeDetail = "not reported by current backend";
  const missingAvailabilityDetail = "not reported by current backend capability registry";
  const missingCapabilityDetail = "not reported by current backend capability registry";

  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Prompt Plan</h3>
      <p style={subtleTextStyle}>
        Inspect the admitted typed plan, refused capabilities, and step-by-step safety posture produced from the selected prompt.
      </p>
      <PanelGuideDetails
        tooltip={promptPlanGuide.tooltip}
        checklist={promptPlanGuide.checklist}
      />
      {!session ? (
        <p style={emptyTextStyle}>Select a prompt session to inspect its admitted plan.</p>
      ) : !session.plan ? (
        <p style={emptyTextStyle}>This prompt session does not have a persisted plan.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div title={promptPlanSummaryControlGuide.tooltip} style={summaryCardStyle}>
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
                const capabilityEntry = capabilities.find((capability) => capability.tool_name === step.tool);

                return (
                  <article key={step.step_id} title={promptPlanStepControlGuide.tooltip} style={stepCardStyle}>
                    <div style={stepHeaderStyle}>
                      <strong>{step.step_id}</strong>
                      <span>{step.tool}</span>
                    </div>
                    <div style={subtleTextStyle}>Agent: {step.agent}</div>
                    <div style={subtleTextStyle}>Approval: {step.approval_class}</div>
                    <div style={subtleTextStyle}>
                      Capability status:{" "}
                      <StatusChip
                        label={step.capability_status_required || missingCapabilityDetail}
                        tone={getCapabilityTone(step.capability_status_required)}
                      />
                    </div>
                    <div style={subtleTextStyle}>Maturity: {step.capability_maturity}</div>
                    <div style={subtleTextStyle}>
                      Real admission stage:{" "}
                      {capabilityEntry?.real_admission_stage ? (
                        <StatusChip
                          label={capabilityEntry.real_admission_stage}
                          tone={getAdmissionTone(capabilityEntry.real_admission_stage)}
                        />
                      ) : (
                        missingCapabilityDetail
                      )}
                    </div>
                    <div style={subtleTextStyle}>
                      Real adapter availability:{" "}
                      {renderAvailabilityValue(
                        capabilityEntry?.real_adapter_availability,
                        missingAvailabilityDetail,
                      )}
                    </div>
                    <div style={subtleTextStyle}>
                      Dry-run availability:{" "}
                      {renderAvailabilityValue(
                        capabilityEntry?.dry_run_availability,
                        missingAvailabilityDetail,
                      )}
                    </div>
                    <div style={subtleTextStyle}>
                      Simulation fallback availability:{" "}
                      {renderAvailabilityValue(
                        capabilityEntry?.simulation_fallback_availability,
                        missingAvailabilityDetail,
                      )}
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
                        Safety envelope metadata is missing from the current backend payload; prompt-plan detail for this step is incomplete.
                      </div>
                    ) : null}
                    {safetyEnvelope?.natural_language_blocker ? (
                      <div style={blockerTextStyle}>
                        Blocker: {safetyEnvelope.natural_language_blocker}
                      </div>
                    ) : null}
                    <div style={subtleTextStyle}>
                      Execution truth:{" "}
                      <StatusChip
                        label={step.simulated_allowed ? "simulated allowed" : "real path preferred"}
                        tone={getExecutionTruthTone(step.simulated_allowed)}
                      />
                    </div>
                    {step.depends_on.length > 0 ? (
                      <div style={subtleTextStyle}>Depends on: {step.depends_on.join(", ")}</div>
                    ) : null}
                    <pre title={promptPlanArgsControlGuide.tooltip} style={argsStyle}>{JSON.stringify(step.args, null, 2)}</pre>
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

function formatAvailability(
  value: boolean | undefined,
  missingAvailabilityDetail: string,
): string {
  if (value === undefined) {
    return missingAvailabilityDetail;
  }
  return value ? "available" : "not available";
}

function renderAvailabilityValue(
  value: boolean | undefined,
  missingAvailabilityDetail: string,
) {
  if (value === undefined) {
    return missingAvailabilityDetail;
  }

  return (
    <StatusChip
      label={formatAvailability(value, missingAvailabilityDetail)}
      tone={getAvailabilityTone(value)}
    />
  );
}

const panelStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "var(--app-panel-padding)",
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  background: "var(--app-panel-bg)",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const stepCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  display: "grid",
  gap: 6,
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const stepHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
} satisfies CSSProperties;

const argsStyle = {
  margin: 0,
  padding: 12,
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-command-bg)",
  color: "var(--app-command-text)",
  overflowX: "auto" as const,
  fontSize: 12,
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
} satisfies CSSProperties;

const blockerTextStyle = {
  color: "var(--app-warning-text)",
  fontSize: 13,
} satisfies CSSProperties;

const listStyle = {
  margin: "8px 0 0 0",
  paddingLeft: 18,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const emptyTextStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;
