import { useMemo, useState } from "react";

import {
  describeBuildConfigureMeaning,
  describeSettingsPatchPolicyMeaning,
} from "../lib/capabilityNarrative";
import type { ToolPolicy } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAdmissionTone,
  getCapabilityTone,
  getExecutionModeTone,
} from "./statusChipTones";
import {
  summaryMutedTextStyle,
  summaryControlRowStyle,
  summarySearchInputStyle,
} from "./summaryPrimitives";

type PoliciesPanelProps = {
  items: ToolPolicy[];
  loading: boolean;
  error: string | null;
};

export default function PoliciesPanel({
  items,
  loading,
  error,
}: PoliciesPanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesPolicySearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Policies"
      description="These policy records describe approval, lock, and execution guardrails. Execution mode and capability status remain explicitly labeled, including simulated, plan-only, and mutation-candidate tool surfaces."
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No policies match the current search." : "No policies published yet."}
      hasItems={filteredItems.length > 0}
    >
      <div style={summaryControlRowStyle}>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search policies by tool, agent, capability, risk, or locks"
          style={summarySearchInputStyle}
        />
      </div>
      <SummaryList>
          {filteredItems.map((item) => (
            <SummaryListItem key={`${item.agent}:${item.tool}`} card>
                <strong>{item.tool}</strong>
                <SummaryFacts>
                  <SummaryFact label="Agent">{item.agent}</SummaryFact>
                  <SummaryFact label="Approval class">{item.approval_class}</SummaryFact>
                  <SummaryFact label="Capability">
                    <StatusChip label={item.capability_status} tone={getCapabilityTone(item.capability_status)} />
                  </SummaryFact>
                  <SummaryFact label="Admission stage">
                    <StatusChip label={item.real_admission_stage} tone={getAdmissionTone(item.real_admission_stage)} />
                  </SummaryFact>
                  <SummaryFact label="Requires approval">
                    <StatusChip label={String(item.requires_approval)} tone={item.requires_approval ? "warning" : "neutral"} />
                  </SummaryFact>
                  <SummaryFact label="Required locks">
                    {item.required_locks.join(", ") || "none"}
                  </SummaryFact>
                  <SummaryFact label="Risk">{item.risk}</SummaryFact>
                  <SummaryFact label="Execution mode">
                    <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                  </SummaryFact>
                  <SummaryFact label="Next requirement">{item.next_real_requirement}</SummaryFact>
                </SummaryFacts>
              {item.tool === "build.configure" ? (
                <div style={{ ...summaryMutedTextStyle, marginTop: 8 }}>
                  Meaning: {describeBuildConfigureMeaning()}
                </div>
              ) : null}
              {item.tool === "settings.patch" ? (
                <div style={{ ...summaryMutedTextStyle, marginTop: 8 }}>
                  Meaning: {describeSettingsPatchPolicyMeaning()}
                </div>
              ) : null}
            </SummaryListItem>
          ))}
      </SummaryList>
    </SummarySection>
  );
}

function matchesPolicySearch(item: ToolPolicy, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.agent,
    item.tool,
    item.approval_class,
    item.adapter_family,
    item.capability_status,
    item.real_admission_stage,
    item.next_real_requirement,
    item.risk,
    item.execution_mode,
    item.required_locks.join(" "),
  ].some((value) => value.toLowerCase().includes(query));
}
