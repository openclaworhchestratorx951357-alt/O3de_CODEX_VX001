import type { CSSProperties } from "react";

import type { PlacementProofOnlyReviewSnapshot } from "../lib/promptPlacementProofOnlyReview";
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
  latestPlacementProofOnlyReview?: PlacementProofOnlyReviewSnapshot | null;
  nextSafeAction: string;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onOpenPromptSessionDetail?: (promptId: string) => void;
  onOpenExecutionDetail?: (executionId: string) => void;
  onOpenArtifactDetail?: (artifactId: string) => void;
  onOpenRunDetail?: (runId: string) => void;
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

function flagValue(value: boolean | null | undefined): string {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  return "unknown";
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
  latestPlacementProofOnlyReview = null,
  nextSafeAction,
  onViewLatestRun,
  onViewExecution,
  onViewArtifact,
  onViewEvidence,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
  onOpenPromptSessionDetail,
  onOpenExecutionDetail,
  onOpenArtifactDetail,
  onOpenRunDetail,
}: MissionTruthRailProps) {
  const placementProofReview = latestPlacementProofOnlyReview;
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
  if (!placementProofReview) {
    warnings.push("no latest placement proof-only snapshot selected");
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
        <TruthRow label="Mutation occurred" value={mutationResult} />
        <TruthRow label="Latest run" value={latestRunId ?? "no latest run selected"} />
        <TruthRow label="Latest execution" value={latestExecutionId ?? "no latest execution selected"} />
        <TruthRow label="Latest artifact" value={latestArtifactId ?? "no latest artifact selected"} />
      </div>
      <section aria-label="Latest placement proof-only remediation snapshot" style={styles.snapshot}>
        <strong>Latest placement proof-only remediation snapshot</strong>
        {placementProofReview ? (
          <>
            <div style={styles.grid}>
              <TruthRow label="Capability" value={placementProofReview.capabilityName} />
              <TruthRow label="Prompt session id" value={placementProofReview.promptSessionId} />
              <TruthRow label="Proof run id" value={placementProofReview.childRunId ?? "not reported"} />
              <TruthRow label="Proof execution id" value={placementProofReview.childExecutionId ?? "not reported"} />
              <TruthRow label="Proof artifact id" value={placementProofReview.childArtifactId ?? "not reported"} />
              <TruthRow label="Proof status" value={placementProofReview.proofStatus ?? "not reported"} />
              <TruthRow label="Candidate id" value={placementProofReview.candidateId ?? "not reported"} />
              <TruthRow label="Candidate label" value={placementProofReview.candidateLabel ?? "not reported"} />
              <TruthRow label="Artifact reference" value={formatArtifactReference(placementProofReview.artifactLabel, placementProofReview.artifactId)} />
              <TruthRow label="Staged source path" value={placementProofReview.stagedSourceRelativePath ?? "not reported"} />
              <TruthRow label="Target level path" value={placementProofReview.targetLevelRelativePath ?? "not reported"} />
              <TruthRow label="Target entity" value={placementProofReview.targetEntityName ?? "not reported"} />
              <TruthRow label="Target component" value={placementProofReview.targetComponent ?? "not reported"} />
              <TruthRow label="Stage-write evidence ref" value={placementProofReview.stageWriteEvidenceReference ?? "not reported"} />
              <TruthRow label="Stage-write readback ref" value={placementProofReview.stageWriteReadbackReference ?? "not reported"} />
              <TruthRow label="Stage-write readback status" value={placementProofReview.stageWriteReadbackStatus ?? "not reported"} />
              <TruthRow label="Execution mode" value={placementProofReview.executionMode ?? "not reported"} />
              <TruthRow label="Inspection surface" value={placementProofReview.inspectionSurface ?? "not reported"} />
              <TruthRow label="execution_admitted" value={flagValue(placementProofReview.executionAdmitted)} />
              <TruthRow label="placement_write_admitted" value={flagValue(placementProofReview.placementWriteAdmitted)} />
              <TruthRow label="mutation_occurred" value={flagValue(placementProofReview.mutationOccurred)} />
              <TruthRow label="read_only" value={flagValue(placementProofReview.readOnly)} />
              <TruthRow label="Fail-closed reasons" value={placementProofReview.failClosedReasons.length > 0 ? placementProofReview.failClosedReasons.join(", ") : "not reported"} />
              <TruthRow label="Server decision code" value={placementProofReview.serverDecisionCode ?? "not reported"} />
              <TruthRow label="Server decision state" value={placementProofReview.serverDecisionState ?? "not reported"} />
              <TruthRow label="Server status" value={placementProofReview.serverStatus ?? "not reported"} />
              <TruthRow label="Server blocker reason" value={placementProofReview.serverReason ?? "not reported"} />
              <TruthRow label="Server blocker remediation" value={placementProofReview.serverRemediation ?? "not reported"} />
            </div>
            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => onOpenPromptSessionDetail?.(placementProofReview.promptSessionId)}
                disabled={!onOpenPromptSessionDetail}
                style={styles.button}
              >
                Open proof prompt session
              </button>
              <button
                type="button"
                onClick={() => {
                  if (placementProofReview.childRunId) {
                    onOpenRunDetail?.(placementProofReview.childRunId);
                  }
                }}
                disabled={!placementProofReview.childRunId || !onOpenRunDetail}
                style={styles.button}
              >
                Open proof run
              </button>
              <button
                type="button"
                onClick={() => {
                  if (placementProofReview.childExecutionId) {
                    onOpenExecutionDetail?.(placementProofReview.childExecutionId);
                  }
                }}
                disabled={!placementProofReview.childExecutionId || !onOpenExecutionDetail}
                style={styles.button}
              >
                Open proof execution
              </button>
              <button
                type="button"
                onClick={() => {
                  if (placementProofReview.childArtifactId) {
                    onOpenArtifactDetail?.(placementProofReview.childArtifactId);
                  }
                }}
                disabled={!placementProofReview.childArtifactId || !onOpenArtifactDetail}
                style={styles.button}
              >
                Open proof artifact
              </button>
            </div>
          </>
        ) : (
          <p style={styles.detail}>no latest placement proof-only snapshot selected</p>
        )}
      </section>

      <p style={styles.detail}>
        Placement proof truth: `execution_admitted=false`, `placement_write_admitted=false`, `mutation_occurred=false` on fail-closed proof-only outcomes.
      </p>
      <p style={styles.detail}>
        Real placement remains blocked: placement runtime execution is non-admitted, placement write is non-admitted, and no mutation occurred on proof-only results.
      </p>
      <p style={styles.detail}>
        Next missing gate: exact placement admission corridor with server-owned approval/session truth, readback proof, and revert/restore proof.
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
  const safetyCritical = isSafetyCriticalLabel(label);
  return (
    <div style={{ ...styles.row, ...(safetyCritical ? styles.rowSafety : null) }}>
      <span style={{ ...styles.rowLabel, ...(safetyCritical ? styles.rowLabelSafety : null) }}>{label}</span>
      <code style={{ ...styles.rowValue, ...(safetyCritical ? styles.rowValueSafety : null) }}>{value}</code>
    </div>
  );
}

function isSafetyCriticalLabel(label: string): boolean {
  const normalized = label.toLowerCase();
  return normalized === "mutation admitted"
    || normalized === "placement write admitted"
    || normalized === "execution_admitted"
    || normalized === "placement_write_admitted"
    || normalized === "mutation_occurred";
}

function formatArtifactReference(label: string | undefined, id: string | undefined): string {
  if (!label && !id) {
    return "not reported";
  }
  if (label && id) {
    return `${label} (${id})`;
  }
  return label ?? id ?? "not reported";
}

const styles = {
  shell: {
    border: "1px solid var(--app-panel-border-strong)",
    borderRadius: "var(--app-card-radius)",
    padding: 12,
    display: "grid",
    gap: 10,
    background: "var(--app-truth-rail-shell-bg)",
    boxShadow: "var(--app-shadow-soft)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    border: "1px solid var(--app-panel-border-strong)",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    color: "var(--app-text-color)",
    background: "var(--app-active-bg)",
    boxShadow: "var(--app-shadow-soft)",
  },
  grid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  snapshot: {
    display: "grid",
    gap: 8,
    border: "1px solid var(--app-panel-border-strong)",
    borderRadius: 8,
    padding: "10px 12px",
    background: "var(--app-truth-rail-snapshot-bg)",
    boxShadow: "var(--app-shadow-soft)",
  },
  row: {
    display: "grid",
    gap: 4,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "var(--app-truth-rail-row-bg)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  },
  rowSafety: {
    borderColor: "var(--app-warning-border)",
    background: "var(--app-truth-rail-safety-bg)",
    boxShadow: "inset 3px 0 0 rgba(248, 199, 108, 0.72), inset 0 1px 0 rgba(255, 252, 242, 0.12)",
  },
  rowLabel: {
    fontSize: 12,
    color: "var(--app-subtle-color)",
    letterSpacing: "0.02em",
  },
  rowLabelSafety: {
    color: "var(--app-warning-text)",
    fontWeight: 700,
  },
  rowValue: {
    fontSize: 12,
    overflowWrap: "anywhere",
    color: "var(--app-text-color)",
    fontWeight: 600,
  },
  rowValueSafety: {
    color: "var(--app-text-color)",
    textShadow: "0 0 14px rgba(248, 199, 108, 0.2)",
  },
  detail: {
    margin: 0,
    fontSize: 13,
    color: "var(--app-muted-color)",
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
