import type { RunRecord, SettingsPatchMutationAudit } from "../types/contracts";
import SummarySection from "./SummarySection";
import { formatSummaryTimestamp } from "./summaryPrimitives";

type RunDetailPanelProps = {
  item: RunRecord | null;
  loading: boolean;
  error: string | null;
  executionDetails?: Record<string, unknown> | null;
};

function readMutationAudit(
  details: Record<string, unknown> | null | undefined,
): SettingsPatchMutationAudit | null {
  const value = details?.mutation_audit;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as SettingsPatchMutationAudit)
    : null;
}

function describeRunTruth(item: RunRecord): string {
  if (item.execution_mode === "real" && item.tool === "project.inspect") {
    return "This run used the real read-only project.inspect path and may include manifest-backed project-config subset matching, manifest-backed Gem subset/source evidence, and manifest-backed top-level settings subset evidence.";
  }
  if (item.execution_mode === "real" && item.tool === "build.configure") {
    return "This run used the real plan-only build.configure preflight path.";
  }
  if (item.execution_mode === "real" && item.tool === "settings.patch") {
    if (item.result_summary?.includes("mutation completed")) {
      return "This run used the first real settings.patch mutation path.";
    }
    if (item.result_summary?.includes("mutation-ready")) {
      return "This run validated a mutation-ready settings.patch plan, but writes remained intentionally disabled.";
    }
    return "This run used the real dry-run-only settings.patch preflight path; no settings were written.";
  }
  if (item.execution_mode === "simulated" && item.tool === "build.configure") {
    return "This build.configure run remained on a simulated fallback path.";
  }
  if (item.execution_mode === "simulated" && item.tool === "settings.patch") {
    return "This settings.patch run remained on a simulated path.";
  }
  return "This run remained on a simulated execution path.";
}

export default function RunDetailPanel({
  item,
  loading,
  error,
  executionDetails,
}: RunDetailPanelProps) {
  const mutationAudit = readMutationAudit(executionDetails);
  return (
    <SummarySection
      title="Run Detail"
      description="This view shows one persisted run record with explicit execution truth, including simulated runs."
      loading={loading}
      error={error}
      emptyMessage="Select a run to inspect its detail."
      hasItems={Boolean(item)}
    >
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <article style={detailCardStyle}>
          <h4 style={detailHeadingStyle}>Identity</h4>
          <div><strong>Run ID:</strong> {item?.id}</div>
          <div><strong>Request ID:</strong> {item?.request_id}</div>
          <div><strong>Agent:</strong> {item?.agent}</div>
          <div><strong>Tool:</strong> {item?.tool}</div>
        </article>
        <article style={detailCardStyle}>
          <h4 style={detailHeadingStyle}>Execution</h4>
          <div><strong>Status:</strong> {item?.status}</div>
          <div><strong>Execution mode:</strong> {item?.execution_mode}</div>
          <div><strong>Dry run:</strong> {String(item?.dry_run)}</div>
          <div>
            <strong>Created:</strong>{" "}
            {item ? formatSummaryTimestamp(item.created_at) : ""}
          </div>
          <div>
            <strong>Updated:</strong>{" "}
            {item ? formatSummaryTimestamp(item.updated_at) : ""}
          </div>
        </article>
        <article style={detailCardStyle}>
          <h4 style={detailHeadingStyle}>Truth Boundary</h4>
          <div>{item ? describeRunTruth(item) : null}</div>
          {item?.result_summary ? (
            <div style={{ marginTop: 8 }}>
              <strong>Summary:</strong> {item.result_summary}
            </div>
          ) : null}
        </article>
        <article style={detailCardStyle}>
          <h4 style={detailHeadingStyle}>Locks And Warnings</h4>
          <div>
            <strong>Requested locks:</strong>{" "}
            {item?.requested_locks.join(", ") || "none"}
          </div>
          <div>
            <strong>Granted locks:</strong>{" "}
            {item?.granted_locks.join(", ") || "none"}
          </div>
          <div>
            <strong>Warnings:</strong> {item?.warnings.join(", ") || "none"}
          </div>
        </article>
        {item?.tool === "settings.patch" && mutationAudit ? (
          <article style={detailCardStyle}>
            <h4 style={detailHeadingStyle}>Mutation Audit</h4>
            <div>
              <strong>Audit summary:</strong> {mutationAudit.summary ?? "available"}
            </div>
            <div>
              <strong>Audit phase:</strong> {mutationAudit.phase ?? "unknown"}
            </div>
            <div>
              <strong>Audit status:</strong> {mutationAudit.status ?? "unknown"}
            </div>
            {typeof mutationAudit.backup_created === "boolean" ? (
              <div>
                <strong>Backup created:</strong> {String(mutationAudit.backup_created)}
              </div>
            ) : null}
            {typeof mutationAudit.post_write_verification_succeeded === "boolean" ? (
              <div>
                <strong>Verification succeeded:</strong>{" "}
                {String(mutationAudit.post_write_verification_succeeded)}
              </div>
            ) : null}
            {mutationAudit.rollback_outcome ? (
              <div>
                <strong>Rollback outcome:</strong> {mutationAudit.rollback_outcome}
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </SummarySection>
  );
}

const detailCardStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  background: "#f6f8fa",
  display: "grid",
  gap: 8,
};

const detailHeadingStyle = {
  margin: 0,
};
