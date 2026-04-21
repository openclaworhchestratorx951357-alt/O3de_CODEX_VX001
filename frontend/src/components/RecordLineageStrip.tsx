import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getAuditStatusTone,
  getExecutionModeTone,
  getExecutionStatusTone,
  getRunStatusTone,
} from "./statusChipTones";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

type RecordLineageStripProps = {
  runId?: string | null;
  runStatus?: string | null;
  runSummary?: string | null;
  executionId?: string | null;
  executionStatus?: string | null;
  executionSummary?: string | null;
  artifactId?: string | null;
  artifactLabel?: string | null;
  artifactKind?: string | null;
  artifactMode?: string | null;
  artifactSimulated?: boolean | null;
  executionMode?: string | null;
  runUpdatedAt?: string | null;
  runWarningCount?: number | null;
  executionStartedAt?: string | null;
  executionWarningCount?: number | null;
  artifactCreatedAt?: string | null;
  artifactAuditStatus?: string | null;
  selectedRunId?: string | null;
  selectedExecutionId?: string | null;
  selectedArtifactId?: string | null;
  onOpenRun?: (runId: string) => void;
  onOpenExecution?: (executionId: string) => void;
  onOpenArtifact?: (artifactId: string) => void;
  runActionTitle?: string | null;
  executionActionTitle?: string | null;
  artifactActionTitle?: string | null;
};

const recordLineageTooltip =
  "Use Record Lineage to move between related persisted runs, executions, and artifacts without losing the current review context.";

function buildLineageActionTitle(
  recordType: "run" | "execution" | "artifact",
  recordId: string,
  selected: boolean,
): string {
  if (selected) {
    return `Current ${recordType} ${recordId} is already selected in this detail view.`;
  }

  return `Open ${recordType} ${recordId} to inspect the related persisted ${recordType} record without leaving the current lineage flow.`;
}

export default function RecordLineageStrip({
  runId,
  runStatus,
  runSummary,
  executionId,
  executionStatus,
  executionSummary,
  artifactId,
  artifactLabel,
  artifactKind,
  artifactMode,
  artifactSimulated,
  executionMode,
  runUpdatedAt,
  runWarningCount,
  executionStartedAt,
  executionWarningCount,
  artifactCreatedAt,
  artifactAuditStatus,
  selectedRunId,
  selectedExecutionId,
  selectedArtifactId,
  onOpenRun,
  onOpenExecution,
  onOpenArtifact,
  runActionTitle = null,
  executionActionTitle = null,
  artifactActionTitle = null,
}: RecordLineageStripProps) {
  const hasRunSection = Boolean(
    runId ||
      runStatus ||
      runSummary ||
      runUpdatedAt ||
      typeof runWarningCount === "number",
  );
  const hasExecutionSection = Boolean(
    executionId ||
      executionStatus ||
      executionSummary ||
      executionMode ||
      executionStartedAt ||
      typeof executionWarningCount === "number",
  );
  const hasArtifactSection = Boolean(
    artifactId ||
      artifactLabel ||
      artifactKind ||
      artifactMode ||
      artifactCreatedAt ||
      artifactAuditStatus ||
      typeof artifactSimulated === "boolean",
  );

  if (!hasRunSection && !hasExecutionSection && !hasArtifactSection) {
    return null;
  }

  return (
    <article style={{ ...summaryCardStyle, marginBottom: 12 }} title={recordLineageTooltip}>
      <h4 style={summaryCardHeadingStyle}>Record Lineage</h4>
      <div style={summaryCardGridStyle}>
        {hasRunSection ? (
          <section style={summaryCardStyle}>
            <h5 style={summaryCardHeadingStyle}>Run</h5>
            {runStatus ? (
              <StatusChip
                label={runStatus}
                tone={getRunStatusTone(runStatus)}
              />
            ) : null}
            {runSummary ? <div>{runSummary}</div> : null}
            <SummaryFacts>
              <SummaryFact label="Run ID" copyValue={runId ?? undefined}>
                {runId ?? "not linked"}
              </SummaryFact>
              {runUpdatedAt ? (
                <SummaryFact label="Updated">
                  <span style={summaryMutedTextStyle}>
                    {formatSummaryTimestamp(runUpdatedAt)}
                  </span>
                </SummaryFact>
              ) : null}
              {typeof runWarningCount === "number" ? (
                <SummaryFact label="Warnings">
                  <StatusChip
                    label={String(runWarningCount)}
                    tone={runWarningCount > 0 ? "warning" : "success"}
                  />
                </SummaryFact>
              ) : null}
            </SummaryFacts>
            {runId && onOpenRun ? (
              <button
                type="button"
                style={summaryActionButtonStyle}
                title={
                  runActionTitle
                  ?? buildLineageActionTitle("run", runId, selectedRunId === runId)
                }
                disabled={selectedRunId === runId}
                onClick={() => onOpenRun(runId)}
              >
                {selectedRunId === runId ? "Current run" : "Open run"}
              </button>
            ) : null}
          </section>
        ) : null}
        {hasExecutionSection ? (
          <section style={summaryCardStyle}>
            <h5 style={summaryCardHeadingStyle}>Execution</h5>
            {executionStatus ? (
              <StatusChip
                label={executionStatus}
                tone={getExecutionStatusTone(executionStatus)}
              />
            ) : null}
            {executionSummary ? <div>{executionSummary}</div> : null}
            <SummaryFacts>
              <SummaryFact label="Execution ID" copyValue={executionId ?? undefined}>
                {executionId ?? "not linked"}
              </SummaryFact>
              {executionMode ? (
                <SummaryFact label="Mode">
                  <StatusChip
                    label={executionMode}
                    tone={getExecutionModeTone(executionMode)}
                  />
                </SummaryFact>
              ) : null}
              {executionStartedAt ? (
                <SummaryFact label="Started">
                  <span style={summaryMutedTextStyle}>
                    {formatSummaryTimestamp(executionStartedAt)}
                  </span>
                </SummaryFact>
              ) : null}
              {typeof executionWarningCount === "number" ? (
                <SummaryFact label="Warnings">
                  <StatusChip
                    label={String(executionWarningCount)}
                    tone={executionWarningCount > 0 ? "warning" : "success"}
                  />
                </SummaryFact>
              ) : null}
            </SummaryFacts>
            {executionId && onOpenExecution ? (
              <button
                type="button"
                style={summaryActionButtonStyle}
                title={
                  executionActionTitle
                  ?? buildLineageActionTitle(
                    "execution",
                    executionId,
                    selectedExecutionId === executionId,
                  )
                }
                disabled={selectedExecutionId === executionId}
                onClick={() => onOpenExecution(executionId)}
              >
                {selectedExecutionId === executionId ? "Current execution" : "Open execution"}
              </button>
            ) : null}
          </section>
        ) : null}
        {hasArtifactSection ? (
          <section style={summaryCardStyle}>
            <h5 style={summaryCardHeadingStyle}>Artifact</h5>
            {artifactLabel ? <div>{artifactLabel}</div> : null}
            {artifactKind ? (
              <div style={summaryMutedTextStyle}>{artifactKind}</div>
            ) : null}
            <SummaryFacts>
              <SummaryFact label="Artifact ID" copyValue={artifactId ?? undefined}>
                {artifactId ?? "not linked"}
              </SummaryFact>
              {artifactMode ? (
                <SummaryFact label="Mode">
                  <StatusChip
                    label={artifactMode}
                    tone={getExecutionModeTone(artifactMode)}
                  />
                </SummaryFact>
              ) : null}
              {artifactCreatedAt ? (
                <SummaryFact label="Created">
                  <span style={summaryMutedTextStyle}>
                    {formatSummaryTimestamp(artifactCreatedAt)}
                  </span>
                </SummaryFact>
              ) : null}
              {artifactAuditStatus ? (
                <SummaryFact label="Audit">
                  <StatusChip
                    label={artifactAuditStatus}
                    tone={getAuditStatusTone(artifactAuditStatus)}
                  />
                </SummaryFact>
              ) : null}
              {typeof artifactSimulated === "boolean" ? (
                <SummaryFact label="Simulated">
                  <StatusChip
                    label={String(artifactSimulated)}
                    tone={artifactSimulated ? "warning" : "success"}
                  />
                </SummaryFact>
              ) : null}
            </SummaryFacts>
            {artifactId && onOpenArtifact ? (
              <button
                type="button"
                style={summaryActionButtonStyle}
                title={
                  artifactActionTitle
                  ?? buildLineageActionTitle(
                    "artifact",
                    artifactId,
                    selectedArtifactId === artifactId,
                  )
                }
                disabled={selectedArtifactId === artifactId}
                onClick={() => onOpenArtifact(artifactId)}
              >
                {selectedArtifactId === artifactId ? "Current artifact" : "Open artifact"}
              </button>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}
