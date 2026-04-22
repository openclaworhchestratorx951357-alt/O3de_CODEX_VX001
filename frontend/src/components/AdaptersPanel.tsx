import type { CSSProperties } from "react";

import type { AdaptersResponse } from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import ExpandablePanelSection from "./ExpandablePanelSection";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getAdapterModeTone,
} from "./statusChipTones";
import {
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

const adaptersPanelGuide = getPanelGuide("adapter-registry");
const adaptersRegistrySummaryControlGuide = getPanelControlGuide("adapter-registry", "registry-summary");
const adaptersPathRollupControlGuide = getPanelControlGuide("adapter-registry", "path-rollup");
const adaptersFamilyCardControlGuide = getPanelControlGuide("adapter-registry", "family-card");

type AdaptersPanelProps = {
  adapters: AdaptersResponse | null;
  loading: boolean;
  error: string | null;
};

export default function AdaptersPanel(
  { adapters, loading, error }: AdaptersPanelProps,
) {
  return (
    <SummarySection
      title="Adapter Registry"
      description="Read-only adapter registry view. Control-plane bookkeeping is real, but only the named hybrid paths below should be treated as real today. Everything else remains explicitly simulated or plan-only."
      guideTooltip={adaptersPanelGuide.tooltip}
      guideChecklist={adaptersPanelGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage="No adapter registry data available."
      hasItems={Boolean(adapters)}
      marginTop={24}
    >
      {adapters ? (
        <div style={runtimeOverviewGridStyle}>
          <article
            title={adaptersRegistrySummaryControlGuide.tooltip}
            style={summaryCardStyle}
          >
            <h4 style={summaryCardHeadingStyle}>Registry Summary</h4>
            <SummaryFacts>
              <SummaryFact label="Configured mode">
                <StatusChip label={adapters.configured_mode} tone={getAdapterModeTone(adapters.configured_mode)} />
              </SummaryFact>
              <SummaryFact label="Active mode">
                <StatusChip label={adapters.active_mode} tone={getAdapterModeTone(adapters.active_mode)} />
              </SummaryFact>
              <SummaryFact label="Contract version">{adapters.contract_version}</SummaryFact>
              <SummaryFact label="Supported modes">
                {adapters.supported_modes.join(", ") || "none"}
              </SummaryFact>
              <SummaryFact label="Real execution enabled">
                <StatusChip
                  label={adapters.supports_real_execution ? "yes" : "no"}
                  tone={adapters.supports_real_execution ? "success" : "warning"}
                />
              </SummaryFact>
              <SummaryFact label="Boundary summary">
                {summarizeParagraphPreview(
                  adapters.families[0]?.execution_boundary ?? "No adapter boundary reported.",
                )}
              </SummaryFact>
              <SummaryFact label="Warning">{adapters.warning ?? "none"}</SummaryFact>
            </SummaryFacts>
            <ExpandablePanelSection
              title="Execution boundary"
              preview={summarizeParagraphPreview(adapters.families[0]?.execution_boundary ?? "No adapter boundary reported.")}
            >
              <p style={panelParagraphStyle}>
                {adapters.families[0]?.execution_boundary ?? "No adapter boundary reported."}
              </p>
            </ExpandablePanelSection>
          </article>
          <article
            title={adaptersPathRollupControlGuide.tooltip}
            style={summaryCardStyle}
          >
            <h4 style={summaryCardHeadingStyle}>Path Rollup</h4>
            <SummaryFacts>
              <SummaryFact label="Real tool count">
                {adapters.real_tool_paths.length}
              </SummaryFact>
              <SummaryFact label="Plan-only count">
                {adapters.plan_only_tool_paths.length}
              </SummaryFact>
              <SummaryFact label="Simulated count">
                {adapters.simulated_tool_paths.length}
              </SummaryFact>
            </SummaryFacts>
            <ExpandablePanelSection
              title="Real tool paths"
              preview={summarizeListPreview(adapters.real_tool_paths)}
            >
              <PathList paths={adapters.real_tool_paths} />
            </ExpandablePanelSection>
            <ExpandablePanelSection
              title="Plan-only tool paths"
              preview={summarizeListPreview(adapters.plan_only_tool_paths)}
            >
              <PathList paths={adapters.plan_only_tool_paths} />
            </ExpandablePanelSection>
            <ExpandablePanelSection
              title="Simulated paths"
              preview={summarizeListPreview(adapters.simulated_tool_paths)}
            >
              <PathList paths={adapters.simulated_tool_paths} />
            </ExpandablePanelSection>
          </article>
          {adapters.notes.length > 0 ? (
            <article style={summaryCardStyle}>
              <h4 style={summaryCardHeadingStyle}>Notes</h4>
              <ExpandablePanelSection
                title="Registry notes"
                preview={`${adapters.notes.length} note${adapters.notes.length === 1 ? "" : "s"}`}
              >
                <ul style={runtimeListStyle}>
                  {adapters.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </ExpandablePanelSection>
            </article>
          ) : null}
          {adapters.families.length === 0 ? (
            <article style={summaryCardStyle}>
              <h4 style={summaryCardHeadingStyle}>Registered Families</h4>
              <p style={summaryMutedTextStyle}>No adapter families are registered.</p>
            </article>
          ) : (
            adapters.families.map((family) => (
              <article
                key={family.family}
                title={adaptersFamilyCardControlGuide.tooltip}
                style={summaryCardStyle}
              >
                <h4 style={summaryCardHeadingStyle}>{family.family}</h4>
                <SummaryFacts>
                  <SummaryFact label="Mode">
                    <StatusChip label={family.mode} tone={getAdapterModeTone(family.mode)} />
                  </SummaryFact>
                  <SummaryFact label="Ready">
                    <StatusChip
                      label={family.ready ? "yes" : "no"}
                      tone={family.ready ? "success" : "warning"}
                    />
                  </SummaryFact>
                  <SummaryFact label="Real execution">
                    <StatusChip
                      label={family.supports_real_execution ? "yes" : "no"}
                      tone={family.supports_real_execution ? "success" : "warning"}
                    />
                  </SummaryFact>
                  <SummaryFact label="Contract">{family.contract_version}</SummaryFact>
                  <SummaryFact label="Real paths">
                    {family.real_tool_paths.length}
                  </SummaryFact>
                  <SummaryFact label="Plan-only">
                    {family.plan_only_tool_paths.length}
                  </SummaryFact>
                  <SummaryFact label="Simulated paths">
                    {family.simulated_tool_paths.length}
                  </SummaryFact>
                  <SummaryFact label="Boundary summary">
                    {summarizeParagraphPreview(family.execution_boundary)}
                  </SummaryFact>
                </SummaryFacts>
                <ExpandablePanelSection
                  title="Real paths"
                  preview={summarizeListPreview(family.real_tool_paths)}
                >
                  <PathList paths={family.real_tool_paths} />
                </ExpandablePanelSection>
                <ExpandablePanelSection
                  title="Plan-only paths"
                  preview={summarizeListPreview(family.plan_only_tool_paths)}
                >
                  <PathList paths={family.plan_only_tool_paths} />
                </ExpandablePanelSection>
                <ExpandablePanelSection
                  title="Simulated paths"
                  preview={summarizeListPreview(family.simulated_tool_paths)}
                >
                  <PathList paths={family.simulated_tool_paths} />
                </ExpandablePanelSection>
                <ExpandablePanelSection
                  title="Execution boundary"
                  preview={summarizeParagraphPreview(family.execution_boundary)}
                >
                  <p style={panelParagraphStyle}>{family.execution_boundary}</p>
                </ExpandablePanelSection>
              </article>
            ))
          )}
        </div>
      ) : null}
    </SummarySection>
  );
}

function PathList({ paths }: { paths: readonly string[] }) {
  if (paths.length === 0) {
    return <p style={panelParagraphStyle}>none</p>;
  }

  return (
    <ul style={runtimeListStyle}>
      {paths.map((path) => (
        <li key={path}>
          <code>{path}</code>
        </li>
      ))}
    </ul>
  );
}

function summarizeListPreview(entries: readonly string[], maxVisible = 3): string {
  if (entries.length === 0) {
    return "none";
  }

  const preview = entries.slice(0, maxVisible).join(", ");
  const remainder = entries.length - maxVisible;
  return remainder > 0 ? `${preview}, +${remainder} more` : preview;
}

function summarizeParagraphPreview(value: string, maxLength = 96): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

const runtimeOverviewGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  alignItems: "start",
} satisfies CSSProperties;

const runtimeListStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "var(--app-muted-color)",
  lineHeight: 1.6,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const panelParagraphStyle = {
  ...summaryMutedTextStyle,
  margin: 0,
  overflowWrap: "anywhere",
} satisfies CSSProperties;
