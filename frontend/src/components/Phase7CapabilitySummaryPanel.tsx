import type { CSSProperties } from "react";

import type { CatalogAgent } from "../types/contracts";
import OperatorStatusRail from "./OperatorStatusRail";
import StatusChip from "./StatusChip";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { getCapabilityTone, getExecutionModeTone } from "./statusChipTones";
import {
  summaryBadgeStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

type Phase7CapabilitySummaryPanelProps = {
  agents: CatalogAgent[];
};

type CapabilityBucket = {
  label: string;
  tools: string[];
  description: string;
  executionMode: string | null;
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

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  "real-authoring":
    "Admitted real authoring through runtime-owned editor scripts with typed payload/result contracts and explicit preflight rejection. Today this includes the live-validated editor.session.open and editor.level.open paths on McpSandbox.",
  "runtime-reaching":
    "Runtime-reaching editor surface that can hit the live editor boundary, but is not yet live-admitted on McpSandbox. Today this is editor.entity.create while its real prefab/entity behavior is being stabilized.",
  "hybrid-read-only":
    "May use a real read-only path in hybrid mode when its preconditions are satisfied. Today that means project.inspect can capture explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence from project.json.",
  "plan-only":
    "Real only as planning or preflight-oriented evidence. Today build.configure can run a real preflight when dry_run=true, but it still does not execute a real configure mutation.",
  "mutation-gated":
    "Still guarded behind stricter approval and recovery boundaries. Today settings.patch remains tightly gated in the catalog, but the admitted hybrid boundary includes a real preflight path and the first manifest-backed set-only mutation case.",
  "simulated-only":
    "Still fully simulated in the current phase.",
};

export default function Phase7CapabilitySummaryPanel({
  agents,
}: Phase7CapabilitySummaryPanelProps) {
  const buckets = buildBuckets(agents);
  const realAuthoringCount =
    buckets.find((bucket) => bucket.label === "real-authoring")?.tools.length ?? 0;
  const planOnlyCount = buckets.find((bucket) => bucket.label === "plan-only")?.tools.length ?? 0;
  const hybridCount = buckets.find((bucket) => bucket.label === "hybrid-read-only")?.tools.length ?? 0;
  const simulatedCount = buckets.find((bucket) => bucket.label === "simulated-only")?.tools.length ?? 0;
  const mutationGatedCount = buckets.find((bucket) => bucket.label === "mutation-gated")?.tools.length ?? 0;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2>Phase 7 Capability Summary</h2>
      <p style={{ marginTop: 0, color: "var(--app-muted-color)" }}>
        Current operator summary of which tool surfaces are real-capable,
        hybrid-only, planning-only, mutation-gated, or still simulated.
      </p>
      <p style={{ marginTop: 0, color: "var(--app-muted-color)" }}>
        Current accepted real boundary: <strong>project.inspect</strong> can use
        the real read-only manifest path and expose explicit manifest-backed
        config, Gem, settings, origin, presentation, identity, and tag
        evidence. <strong>editor.session.open</strong> and <strong>editor.level.open</strong>{" "}
        are the currently live-validated admitted real editor paths on McpSandbox,
        while <strong>editor.entity.create</strong> remains runtime-reaching but not yet
        live-admitted on McpSandbox. <strong>build.configure</strong>{" "}
        remains real only as a plan-only preflight when <code>dry_run=true</code>.{" "}
        <strong>settings.patch</strong> now has an admitted real hybrid boundary
        for preflight and the first manifest-backed set-only mutation case,
        while broader mutation surfaces remain gated.
      </p>
      {buckets.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <span style={summaryBadgeStyle}>
            real-authoring surfaces: {realAuthoringCount}
          </span>
          <span style={{ ...summaryBadgeStyle, ...runtimeBadgeStyle }}>
            runtime-reaching surfaces: {buckets.find((bucket) => bucket.label === "runtime-reaching")?.tools.length ?? 0}
          </span>
          <span style={{ ...summaryBadgeStyle, ...hybridBadgeStyle }}>
            hybrid-read-only surfaces: {hybridCount}
          </span>
          <span style={{ ...summaryBadgeStyle, ...planOnlyBadgeStyle }}>
            plan-only surfaces: {planOnlyCount}
          </span>
          <span style={{ ...summaryBadgeStyle, ...mutationBadgeStyle }}>
            mutation-gated surfaces: {mutationGatedCount}
          </span>
          <span style={{ ...summaryBadgeStyle, ...simulatedBadgeStyle }}>
            simulated-only surfaces: {simulatedCount}
          </span>
        </div>
      ) : null}
      {buckets.length === 0 ? (
        <p>No capability summary is available until the catalog loads.</p>
      ) : (
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
                <SummaryFact label="Count">{bucket.tools.length}</SummaryFact>
                <SummaryFact label="Execution truth">
                  <StatusChip
                    label={bucket.executionMode ?? "gated"}
                    tone={getExecutionModeTone(bucket.executionMode ?? "gated")}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>{bucket.description}</p>
              <ul style={{ marginBottom: 0 }}>
                {bucket.tools.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function buildBuckets(agents: CatalogAgent[]): CapabilityBucket[] {
  const grouped = new Map<string, string[]>();

  for (const agent of agents) {
    for (const tool of agent.tools) {
      const status = tool.capability_status ?? "simulated-only";
      const tools = grouped.get(status) ?? [];
      tools.push(tool.name);
      grouped.set(status, tools);
    }
  }

  return CAPABILITY_ORDER
    .map((status) => ({
      label: status,
      tools: grouped.get(status) ?? [],
      description: CAPABILITY_DESCRIPTIONS[status],
      executionMode: getBucketExecutionMode(status),
      attentionLabel: getBucketAttentionLabel(status),
    }))
    .filter((bucket) => bucket.tools.length > 0);
}

const cardStyle: CSSProperties = {
  ...summaryCardStyle,
};

const headingStyle: CSSProperties = {
  ...summaryCardHeadingStyle,
};

function getBucketExecutionMode(status: string): string | null {
  if (status === "real-authoring") {
    return "real";
  }
  if (status === "runtime-reaching") {
    return "gated";
  }
  if (status === "hybrid-read-only") {
    return "real";
  }
  if (status === "plan-only" || status === "simulated-only") {
    return "simulated";
  }
  return null;
}

function getBucketAttentionLabel(status: string): string {
  if (status === "real-authoring") {
    return "Live-validated real path";
  }
  if (status === "runtime-reaching") {
    return "Live stability pending";
  }
  if (status === "hybrid-read-only") {
    return "Operator baseline confirmed";
  }
  if (status === "plan-only") {
    return "Preflight boundary";
  }
  if (status === "mutation-gated") {
    return "Audit review needed";
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
