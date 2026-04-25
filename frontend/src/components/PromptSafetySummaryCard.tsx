import type { PromptSafetyEnvelope } from "../types/contracts";
import { getPromptSafetyTone } from "../lib/executionTruth";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  summaryCalloutStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

type PromptSafetySummaryCardProps = {
  safetyEnvelope: PromptSafetyEnvelope | null;
  title?: string;
};

export default function PromptSafetySummaryCard({
  safetyEnvelope,
  title = "Prompt Safety Envelope",
}: PromptSafetySummaryCardProps) {
  if (!safetyEnvelope) {
    return null;
  }

  return (
    <article style={summaryCardStyle}>
      <h4 style={summaryCardHeadingStyle}>{title}</h4>
      <div style={summaryCalloutStyle}>
        Persisted prompt-era safety evidence stays visible here after dispatch so operators can review the same natural-language boundary alongside live execution truth.
      </div>
      <SummaryFacts>
        <SummaryFact label="Natural-language status">
          <StatusChip
            label={safetyEnvelope.natural_language_status}
            tone={getPromptSafetyTone(safetyEnvelope.natural_language_status)}
          />
        </SummaryFact>
        <SummaryFact label="State scope">{safetyEnvelope.state_scope}</SummaryFact>
        <SummaryFact label="Backup class">{safetyEnvelope.backup_class}</SummaryFact>
        <SummaryFact label="Rollback class">{safetyEnvelope.rollback_class}</SummaryFact>
        <SummaryFact label="Verification class">{safetyEnvelope.verification_class}</SummaryFact>
        <SummaryFact label="Retention class">{safetyEnvelope.retention_class}</SummaryFact>
      </SummaryFacts>
      {safetyEnvelope.natural_language_blocker ? (
        <div style={summaryCalloutStyle}>
          <strong>Blocker:</strong> {safetyEnvelope.natural_language_blocker}
        </div>
      ) : null}
    </article>
  );
}
