import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import { getExecutionModeTone } from "./statusChipTones";
import {
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

type RecordLineageStripProps = {
  runId?: string | null;
  executionId?: string | null;
  artifactId?: string | null;
  executionMode?: string | null;
};

export default function RecordLineageStrip({
  runId,
  executionId,
  artifactId,
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
        <SummaryFact label="Execution ID" copyValue={executionId ?? undefined}>
          {executionId ?? "not linked"}
        </SummaryFact>
        <SummaryFact label="Artifact ID" copyValue={artifactId ?? undefined}>
          {artifactId ?? "not linked"}
        </SummaryFact>
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
