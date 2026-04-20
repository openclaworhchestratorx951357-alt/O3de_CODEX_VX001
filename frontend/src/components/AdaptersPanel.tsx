import type { AdaptersResponse } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getAdapterModeTone,
} from "./statusChipTones";
import {
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

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
      loading={loading}
      error={error}
      emptyMessage="No adapter registry data available."
      hasItems={Boolean(adapters)}
      marginTop={24}
    >
      {adapters ? (
        <div style={summaryCardGridStyle}>
          <article style={summaryCardStyle}>
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
              <SummaryFact label="Boundary">
                {adapters.families[0]?.execution_boundary ?? "No adapter boundary reported."}
              </SummaryFact>
              <SummaryFact label="Warning">{adapters.warning ?? "none"}</SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Path Rollup</h4>
            <SummaryFacts>
              <SummaryFact label="Real tool paths">
                {adapters.real_tool_paths.join(", ") || "none"}
              </SummaryFact>
              <SummaryFact label="Plan-only tool paths">
                {adapters.plan_only_tool_paths.join(", ") || "none"}
              </SummaryFact>
              <SummaryFact label="Still simulated">
                {adapters.simulated_tool_paths.length}
              </SummaryFact>
              <SummaryFact label="Simulated paths">
                {adapters.simulated_tool_paths.join(", ") || "none"}
              </SummaryFact>
            </SummaryFacts>
          </article>
          {adapters.notes.length > 0 ? (
            <article style={summaryCardStyle}>
              <h4 style={summaryCardHeadingStyle}>Notes</h4>
              <ul>
                {adapters.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          ) : null}
          {adapters.families.length === 0 ? (
            <article style={summaryCardStyle}>
              <h4 style={summaryCardHeadingStyle}>Registered Families</h4>
              <p style={summaryMutedTextStyle}>No adapter families are registered.</p>
            </article>
          ) : (
            adapters.families.map((family) => (
              <article key={family.family} style={summaryCardStyle}>
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
                    {family.real_tool_paths.join(", ") || "none"}
                  </SummaryFact>
                  <SummaryFact label="Plan-only">
                    {family.plan_only_tool_paths.join(", ") || "none"}
                  </SummaryFact>
                  <SummaryFact label="Simulated paths">
                    {family.simulated_tool_paths.join(", ") || "none"}
                  </SummaryFact>
                  <SummaryFact label="Boundary">{family.execution_boundary}</SummaryFact>
                </SummaryFacts>
              </article>
            ))
          )}
        </div>
      ) : null}
    </SummarySection>
  );
}
