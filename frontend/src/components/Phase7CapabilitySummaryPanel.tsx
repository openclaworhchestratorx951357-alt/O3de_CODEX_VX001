import type { CSSProperties } from "react";

import {
  describeBuildConfigureMeaning,
  describeCatalogCapability,
  describeSettingsPatchPolicyMeaning,
} from "../lib/capabilityNarrative";
import type { ToolPolicy } from "../types/contracts";
import OperatorStatusRail from "./OperatorStatusRail";
import StatusChip from "./StatusChip";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import {
  getCapabilityTone,
  getDryRunSupportTone,
  getExecutionModeTone,
} from "./statusChipTones";
import {
  summaryBadgeStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

type Phase7CapabilitySummaryPanelProps = {
  items: ToolPolicy[];
  loading: boolean;
  error: string | null;
};

type CapabilityBucket = {
  label: string;
  items: ToolPolicy[];
  description: string;
  executionMode: string;
  attentionLabel: string;
};

const CAPABILITY_ORDER = [
  "real-authoring",
  "runtime-reaching",
  "hybrid-read-only",
  "plan-only",
  "mutation-gated",
  "simulated-only",
] as const;

const HIGHLIGHT_TOOL_ORDER = [
  "project.inspect",
  "editor.session.open",
  "editor.level.open",
  "editor.entity.create",
  "build.configure",
  "settings.patch",
] as const;

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  "real-authoring":
    "Admitted real authoring through runtime-owned editor contracts with explicit preflight-visible rejection. This bucket should stay narrow and evidence-backed.",
  "runtime-reaching":
    "Runtime-reaching surfaces can touch the live boundary, but they are not admitted real on the current tested McpSandbox target until stability and recovery proof is complete.",
  "hybrid-read-only":
    "Hybrid read-only surfaces can use a real evidence path when preconditions are satisfied while keeping simulated fallback explicit.",
  "plan-only":
    "Plan-only surfaces may produce real preflight evidence, but they do not imply a live mutation path.",
  "mutation-gated":
    "Mutation-gated surfaces remain under tighter approval, rollback, and verification expectations even when some preflight or narrow mutation proof exists.",
  "simulated-only":
    "These surfaces still remain explicitly simulated in the current phase.",
};

export default function Phase7CapabilitySummaryPanel({
  items,
  loading,
  error,
}: Phase7CapabilitySummaryPanelProps) {
  const buckets = buildBuckets(items);
  const highlights = getHighlightPolicies(items);

  return (
    <section style={{ marginBottom: 32 }}>
      <h2>Phase 7 Capability Summary</h2>
      <p style={{ marginTop: 0, color: "var(--app-muted-color)" }}>
        Current operator summary from the live policy registry. This view groups
        published <code>/policies</code> records by capability status so
        admitted-real, plan-only, gated, and simulated wording stays explicit.
      </p>
      {highlights.length > 0 ? (
        <div style={highlightRowStyle}>
          {highlights.map((policy) => (
            <span key={policy.tool} style={getHighlightBadgeStyle(policy.capability_status)}>
              <strong>{policy.tool}</strong>: {policy.capability_status} / {policy.real_admission_stage}
            </span>
          ))}
        </div>
      ) : null}
      {error ? <p style={{ color: "var(--app-danger-text)" }}>{error}</p> : null}
      {loading ? (
        <p>Loading phase 7 capability summary...</p>
      ) : buckets.length === 0 ? (
        <p>No capability summary is available until live policies load.</p>
      ) : (
        <>
          <div style={countBadgeRowStyle}>
            {CAPABILITY_ORDER.map((label) => {
              const count = buckets.find((bucket) => bucket.label === label)?.items.length ?? 0;
              if (count === 0) {
                return null;
              }

              return (
                <span key={label} style={getHighlightBadgeStyle(label)}>
                  {label} surfaces: {count}
                </span>
              );
            })}
          </div>
          <div style={summaryCardGridStyle}>
            {buckets.map((bucket) => (
              <article
                key={bucket.label}
                style={{
                  ...cardStyle,
                  borderColor: getBucketBorderColor(bucket.label),
                  background: getBucketBackground(bucket.label),
                }}
              >
                <h3 style={headingStyle}>{bucket.label}</h3>
                <SummaryFacts>
                  <SummaryFact label="Operator status">
                    <OperatorStatusRail
                      executionMode={bucket.executionMode}
                      simulated={bucket.label === "simulated-only"}
                      attentionLabel={bucket.attentionLabel}
                    />
                  </SummaryFact>
                  <SummaryFact label="Capability">
                    <StatusChip
                      label={bucket.label}
                      tone={getCapabilityTone(bucket.label)}
                    />
                  </SummaryFact>
                  <SummaryFact label="Count">{bucket.items.length}</SummaryFact>
                  <SummaryFact label="Execution truth">
                    <StatusChip
                      label={bucket.executionMode}
                      tone={getExecutionModeTone(bucket.executionMode)}
                    />
                  </SummaryFact>
                </SummaryFacts>
                <p style={summaryMutedTextStyle}>{bucket.description}</p>
                <div style={toolCardGridStyle}>
                  {bucket.items.map((policy) => (
                    <article key={policy.tool} style={toolCardStyle}>
                      <div style={toolHeadingRowStyle}>
                        <strong>{policy.tool}</strong>
                        <StatusChip
                          label={policy.real_admission_stage}
                          tone={getExecutionModeTone(getPolicyExecutionTruth(policy))}
                        />
                      </div>
                      <SummaryFacts>
                        <SummaryFact label="Agent">{policy.agent}</SummaryFact>
                        <SummaryFact label="Approval class">{policy.approval_class}</SummaryFact>
                        <SummaryFact label="Required locks">
                          {policy.required_locks.join(", ") || "none"}
                        </SummaryFact>
                        <SummaryFact label="Dry run support">
                          <StatusChip
                            label={policy.supports_dry_run ? "supported" : "not supported"}
                            tone={getDryRunSupportTone(policy.supports_dry_run)}
                          />
                        </SummaryFact>
                      </SummaryFacts>
                      <p style={summaryMutedTextStyle}>{describePolicyMeaning(policy)}</p>
                      <p style={{ ...summaryMutedTextStyle, marginBottom: 0 }}>
                        Next requirement: {policy.next_real_requirement}
                      </p>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function buildBuckets(items: ToolPolicy[]): CapabilityBucket[] {
  const grouped = new Map<string, ToolPolicy[]>();

  for (const item of items) {
    const status = item.capability_status || "simulated-only";
    const bucketItems = grouped.get(status) ?? [];
    bucketItems.push(item);
    grouped.set(status, bucketItems);
  }

  return CAPABILITY_ORDER
    .map((status) => ({
      label: status,
      items: (grouped.get(status) ?? []).slice().sort((left, right) => left.tool.localeCompare(right.tool)),
      description: CAPABILITY_DESCRIPTIONS[status],
      executionMode: getBucketExecutionMode(status),
      attentionLabel: getBucketAttentionLabel(status),
    }))
    .filter((bucket) => bucket.items.length > 0);
}

function getHighlightPolicies(items: ToolPolicy[]): ToolPolicy[] {
  const policiesByTool = new Map(items.map((item) => [item.tool, item]));

  return HIGHLIGHT_TOOL_ORDER.map((tool) => policiesByTool.get(tool)).filter(
    (policy): policy is ToolPolicy => Boolean(policy),
  );
}

function describePolicyMeaning(policy: ToolPolicy): string {
  if (policy.tool === "build.configure") {
    return describeBuildConfigureMeaning();
  }
  if (policy.tool === "settings.patch") {
    return describeSettingsPatchPolicyMeaning();
  }
  return describeCatalogCapability(policy.tool, policy.capability_status);
}

const cardStyle: CSSProperties = {
  ...summaryCardStyle,
};

const headingStyle: CSSProperties = {
  ...summaryCardHeadingStyle,
};

const countBadgeRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const highlightRowStyle: CSSProperties = {
  ...countBadgeRowStyle,
  marginBottom: 16,
};

const toolCardGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const toolCardStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  background: "var(--app-panel-bg)",
  display: "grid",
  gap: 8,
};

const toolHeadingRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
};

function getBucketExecutionMode(status: string): string {
  if (status === "real-authoring" || status === "hybrid-read-only") {
    return "real";
  }
  if (status === "plan-only") {
    return "plan-only";
  }
  if (status === "runtime-reaching" || status === "mutation-gated") {
    return "gated";
  }
  return "simulated";
}

function getPolicyExecutionTruth(policy: ToolPolicy): string {
  if (policy.real_admission_stage.includes("real-editor-authoring-active")) {
    return "real";
  }
  if (policy.real_admission_stage.includes("real-read-only-active")) {
    return "real";
  }
  if (policy.real_admission_stage.includes("real-plan-only-active")) {
    return "plan-only";
  }
  if (
    policy.real_admission_stage.includes("runtime-reaching")
    || policy.real_admission_stage.includes("candidate")
    || policy.real_admission_stage.includes("preflight")
    || policy.real_admission_stage.includes("deferred")
  ) {
    return "gated";
  }
  return "simulated";
}

function getBucketAttentionLabel(status: string): string {
  if (status === "real-authoring") {
    return "Live-validated real path";
  }
  if (status === "runtime-reaching") {
    return "Explicitly excluded from admitted real";
  }
  if (status === "hybrid-read-only") {
    return "Operator baseline confirmed";
  }
  if (status === "plan-only") {
    return "Preflight boundary";
  }
  if (status === "mutation-gated") {
    return "Tighter mutation gate";
  }
  return "Simulation boundary";
}

function getBucketBorderColor(status: string): string {
  if (status === "real-authoring") {
    return "var(--app-success-border)";
  }
  if (status === "runtime-reaching") {
    return "var(--app-runtime-border)";
  }
  if (status === "plan-only") {
    return "var(--app-warning-border)";
  }
  if (status === "mutation-gated") {
    return "var(--app-mutation-border)";
  }
  if (status === "simulated-only") {
    return "var(--app-simulated-border)";
  }
  return "var(--app-info-border)";
}

function getBucketBackground(status: string): string {
  if (status === "real-authoring") {
    return "var(--app-success-bg)";
  }
  if (status === "runtime-reaching") {
    return "var(--app-runtime-bg)";
  }
  if (status === "plan-only") {
    return "var(--app-warning-bg)";
  }
  if (status === "mutation-gated") {
    return "var(--app-mutation-bg)";
  }
  if (status === "simulated-only") {
    return "var(--app-simulated-bg)";
  }
  return "var(--app-info-bg)";
}

function getHighlightBadgeStyle(status: string): CSSProperties {
  if (status === "runtime-reaching") {
    return { ...summaryBadgeStyle, ...runtimeBadgeStyle };
  }
  if (status === "hybrid-read-only") {
    return { ...summaryBadgeStyle, ...hybridBadgeStyle };
  }
  if (status === "plan-only") {
    return { ...summaryBadgeStyle, ...planOnlyBadgeStyle };
  }
  if (status === "mutation-gated") {
    return { ...summaryBadgeStyle, ...mutationBadgeStyle };
  }
  if (status === "simulated-only") {
    return { ...summaryBadgeStyle, ...simulatedBadgeStyle };
  }
  if (status === "real-authoring") {
    return { ...summaryBadgeStyle, ...realBadgeStyle };
  }
  return summaryBadgeStyle;
}

const realBadgeStyle: CSSProperties = {
  background: "var(--app-success-bg)",
  borderColor: "var(--app-success-border)",
  color: "var(--app-success-text)",
};

const runtimeBadgeStyle: CSSProperties = {
  background: "var(--app-runtime-bg)",
  borderColor: "var(--app-runtime-border)",
  color: "var(--app-runtime-text)",
};

const hybridBadgeStyle: CSSProperties = {
  background: "var(--app-info-bg)",
  borderColor: "var(--app-info-border)",
  color: "var(--app-info-text)",
};

const planOnlyBadgeStyle: CSSProperties = {
  background: "var(--app-warning-bg)",
  borderColor: "var(--app-warning-border)",
  color: "var(--app-warning-text)",
};

const mutationBadgeStyle: CSSProperties = {
  background: "var(--app-mutation-bg)",
  borderColor: "var(--app-mutation-border)",
  color: "var(--app-mutation-text)",
};

const simulatedBadgeStyle: CSSProperties = {
  background: "var(--app-simulated-bg)",
  borderColor: "var(--app-simulated-border)",
  color: "var(--app-simulated-text)",
};
