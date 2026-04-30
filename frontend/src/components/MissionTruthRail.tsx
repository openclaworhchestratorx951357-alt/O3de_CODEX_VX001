import type { CSSProperties } from "react";

import type { AdaptersResponse, O3DEBridgeStatus, ReadinessStatus } from "../types/contracts";

type MissionTruthRailProps = {
  locationLabel: string;
  projectLabel?: string | null;
  projectPath?: string | null;
  bridgeStatus?: O3DEBridgeStatus | null;
  adapters?: AdaptersResponse | null;
  readiness?: ReadinessStatus | null;
  currentExecutionMode?: string | null;
  executionAdmitted?: boolean | null;
  placementWriteAdmitted?: boolean | null;
  mutationOccurred?: boolean | null;
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
  nextSafeAction: string;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
};

function yesNoUnknown(value: boolean | null | undefined): string {
  if (value === true) {
    return "yes";
  }
  if (value === false) {
    return "no";
  }
  return "unknown";
}

function valueOrUnknown(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export default function MissionTruthRail({
  locationLabel,
  projectLabel,
  projectPath,
  bridgeStatus = null,
  adapters = null,
  readiness = null,
  currentExecutionMode,
  executionAdmitted = null,
  placementWriteAdmitted = null,
  mutationOccurred = null,
  latestRunId,
  latestExecutionId,
  latestArtifactId,
  nextSafeAction,
  onViewLatestRun,
  onViewExecution,
  onViewArtifact,
  onViewEvidence,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
}: MissionTruthRailProps) {
  const resolvedProjectPath = valueOrUnknown(projectPath, valueOrUnknown(bridgeStatus?.project_root, "not loaded"));
  const resolvedProjectLabel = valueOrUnknown(projectLabel, "unknown project");
  const bridgeLabel = bridgeStatus
    ? `${bridgeStatus.configured ? "configured" : "not configured"}; heartbeat ${bridgeStatus.heartbeat_fresh ? "fresh" : "stale"}`
    : "bridge status unavailable";
  const adapterMode = adapters?.active_mode
    ?? readiness?.adapter_mode?.active_mode
    ?? "adapter status unavailable";
  const executionMode = valueOrUnknown(currentExecutionMode, readiness?.execution_mode ?? "unknown");
  const mutationAdmitted = yesNoUnknown(executionAdmitted);
  const placementAdmitted = yesNoUnknown(placementWriteAdmitted);
  const mutationResult = yesNoUnknown(mutationOccurred);

  const warnings: string[] = [];
  if (!bridgeStatus) {
    warnings.push("bridge status unavailable");
  }
  if (!adapters && !readiness?.adapter_mode) {
    warnings.push("adapter status unavailable");
  }
  if (executionMode === "unknown") {
    warnings.push("execution mode unknown");
  }
  if (!latestRunId) {
    warnings.push("no latest run selected");
  }

  return (
    <section aria-label={`${locationLabel} mission truth rail`} style={styles.shell} data-testid="mission-truth-rail">
      <header style={styles.header}>
        <strong>Mission truth rail</strong>
        <span style={styles.label}>{locationLabel}</span>
      </header>

      <div style={styles.grid}>
        <TruthRow label="Active project" value={`${resolvedProjectLabel} (${resolvedProjectPath})`} />
        <TruthRow label="Editor bridge" value={bridgeLabel} />
        <TruthRow label="Adapter mode" value={adapterMode} />
        <TruthRow label="Execution mode" value={executionMode} />
        <TruthRow label="Mutation admitted" value={mutationAdmitted} />
        <TruthRow label="Placement write admitted" value={placementAdmitted} />
        <TruthRow label="Latest run" value={latestRunId ?? "no latest run selected"} />
        <TruthRow label="Latest execution" value={latestExecutionId ?? "no latest execution selected"} />
        <TruthRow label="Latest artifact" value={latestArtifactId ?? "no latest artifact selected"} />
      </div>

      <p style={styles.detail}>
        Placement proof truth: `execution_admitted=false`, `placement_write_admitted=false`, `mutation_occurred=false` on fail-closed proof-only outcomes.
      </p>
      <p style={styles.detail}><strong>Next safe action:</strong> {nextSafeAction}</p>

      {warnings.length > 0 ? (
        <div style={styles.warningBox}>
          <strong>Warning</strong>
          <ul style={styles.list}>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={styles.actions}>
        <button type="button" onClick={onViewLatestRun} disabled={!onViewLatestRun} style={styles.button}>View latest run</button>
        <button type="button" onClick={onViewExecution} disabled={!onViewExecution} style={styles.button}>View execution</button>
        <button type="button" onClick={onViewArtifact} disabled={!onViewArtifact} style={styles.button}>View artifact</button>
        <button type="button" onClick={onViewEvidence} disabled={!onViewEvidence} style={styles.button}>View evidence</button>
        <button type="button" onClick={onOpenPromptStudio} disabled={!onOpenPromptStudio} style={styles.button}>Open Prompt Studio</button>
        <button type="button" onClick={onOpenRuntimeOverview} disabled={!onOpenRuntimeOverview} style={styles.button}>Open Runtime Overview</button>
        <button type="button" onClick={onOpenRecords} disabled={!onOpenRecords} style={styles.button}>Open Records</button>
      </div>
    </section>
  );
}

function TruthRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <code style={styles.rowValue}>{value}</code>
    </div>
  );
}

const styles = {
  shell: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-card-radius)",
    padding: 12,
    display: "grid",
    gap: 10,
    background: "var(--app-panel-bg)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    color: "var(--app-subtle-color)",
  },
  grid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  row: {
    display: "grid",
    gap: 4,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "var(--app-panel-bg-muted)",
  },
  rowLabel: {
    fontSize: 12,
    color: "var(--app-subtle-color)",
  },
  rowValue: {
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  detail: {
    margin: 0,
    fontSize: 13,
    color: "var(--app-subtle-color)",
  },
  warningBox: {
    border: "1px solid rgba(232, 184, 73, 0.6)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "rgba(109, 78, 13, 0.2)",
    display: "grid",
    gap: 6,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 4,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "6px 10px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
  },
} satisfies Record<string, CSSProperties>;
