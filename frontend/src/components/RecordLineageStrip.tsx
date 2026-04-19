import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getExecutionModeTone,
  getExecutionStatusTone,
  getRunStatusTone,
} from "./statusChipTones";
import {
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
    </article>
  );
}
