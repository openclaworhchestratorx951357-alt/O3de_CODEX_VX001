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
  summaryActionRowStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

type RecordLineageStripProps = {
  runId?: string | null;
  runStatus?: string | null;
  executionId?: string | null;
  executionStatus?: string | null;
  artifactId?: string | null;
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
};

export default function RecordLineageStrip({
  runId,
  runStatus,
  executionId,
  executionStatus,
  artifactId,
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
}: RecordLineageStripProps) {
  if (!runId && !executionId && !artifactId) {
    return null;
  }

  return (
    <article style={{ ...summaryCardStyle, marginBottom: 12 }}>
      <h4 style={summaryCardHeadingStyle}>Record Lineage</h4>
      <SummaryFacts>
        <SummaryFact label="Run ID" copyValue={runId ?? undefined}>
          {runId ?? "not linked"}
        </SummaryFact>
        {runStatus ? (
          <SummaryFact label="Run status">
            <StatusChip
              label={runStatus}
              tone={getRunStatusTone(runStatus)}
            />
          </SummaryFact>
        ) : null}
        {runUpdatedAt ? (
          <SummaryFact label="Run updated">
            {formatSummaryTimestamp(runUpdatedAt)}
          </SummaryFact>
        ) : null}
        {typeof runWarningCount === "number" ? (
          <SummaryFact label="Run warnings">
            <StatusChip
              label={String(runWarningCount)}
              tone={runWarningCount > 0 ? "warning" : "success"}
            />
          </SummaryFact>
        ) : null}
        <SummaryFact label="Execution ID" copyValue={executionId ?? undefined}>
          {executionId ?? "not linked"}
        </SummaryFact>
        {executionStatus ? (
          <SummaryFact label="Execution status">
            <StatusChip
              label={executionStatus}
              tone={getExecutionStatusTone(executionStatus)}
            />
          </SummaryFact>
        ) : null}
        {executionStartedAt ? (
          <SummaryFact label="Execution started">
            {formatSummaryTimestamp(executionStartedAt)}
          </SummaryFact>
        ) : null}
        {typeof executionWarningCount === "number" ? (
          <SummaryFact label="Execution warnings">
            <StatusChip
              label={String(executionWarningCount)}
              tone={executionWarningCount > 0 ? "warning" : "success"}
            />
          </SummaryFact>
        ) : null}
        <SummaryFact label="Artifact ID" copyValue={artifactId ?? undefined}>
          {artifactId ?? "not linked"}
        </SummaryFact>
        {artifactMode ? (
          <SummaryFact label="Artifact mode">
            <StatusChip
              label={artifactMode}
              tone={getExecutionModeTone(artifactMode)}
            />
          </SummaryFact>
        ) : null}
        {artifactCreatedAt ? (
          <SummaryFact label="Artifact created">
            {formatSummaryTimestamp(artifactCreatedAt)}
          </SummaryFact>
        ) : null}
        {artifactAuditStatus ? (
          <SummaryFact label="Artifact audit">
            <StatusChip
              label={artifactAuditStatus}
              tone={getAuditStatusTone(artifactAuditStatus)}
            />
          </SummaryFact>
        ) : null}
        {typeof artifactSimulated === "boolean" ? (
          <SummaryFact label="Artifact simulated">
            <StatusChip
              label={String(artifactSimulated)}
              tone={artifactSimulated ? "warning" : "success"}
            />
          </SummaryFact>
        ) : null}
        {executionMode ? (
          <SummaryFact label="Execution mode">
            <StatusChip
              label={executionMode}
              tone={getExecutionModeTone(executionMode)}
            />
          </SummaryFact>
        ) : null}
      </SummaryFacts>
      <div style={summaryActionRowStyle}>
        {runId && onOpenRun ? (
          <button
            type="button"
            style={summaryActionButtonStyle}
            disabled={selectedRunId === runId}
            onClick={() => onOpenRun(runId)}
          >
            {selectedRunId === runId ? "Current run" : "Open run"}
          </button>
        ) : null}
        {executionId && onOpenExecution ? (
          <button
            type="button"
            style={summaryActionButtonStyle}
            disabled={selectedExecutionId === executionId}
            onClick={() => onOpenExecution(executionId)}
          >
            {selectedExecutionId === executionId ? "Current execution" : "Open execution"}
          </button>
        ) : null}
        {artifactId && onOpenArtifact ? (
          <button
            type="button"
            style={summaryActionButtonStyle}
            disabled={selectedArtifactId === artifactId}
            onClick={() => onOpenArtifact(artifactId)}
          >
            {selectedArtifactId === artifactId ? "Current artifact" : "Open artifact"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
