import type { ProjectInspectEvidenceDetails } from "../types/contracts";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import {
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

type ProjectInspectEvidenceSummaryProps = {
  details: ProjectInspectEvidenceDetails | null | undefined;
  title?: string;
};

function renderJoinedValue(values: string[] | undefined, emptyLabel = "none"): string {
  return values && values.length > 0 ? values.join(", ") : emptyLabel;
}

export default function ProjectInspectEvidenceSummary({
  details,
  title = "Project Inspect Evidence",
}: ProjectInspectEvidenceSummaryProps) {
  if (!details) {
    return null;
  }

  const availableProjectConfigKeys = Array.isArray(details.available_project_config_keys)
    ? details.available_project_config_keys
    : [];
  const availableGemNames = Array.isArray(details.available_gem_names)
    ? details.available_gem_names
    : [];
  const availableUserTags = Array.isArray(details.available_user_tags)
    ? details.available_user_tags
    : [];
  const availableCompatibleEngines = Array.isArray(details.available_compatible_engines)
    ? details.available_compatible_engines
    : [];
  const availableEngineApiDependencyKeys = Array.isArray(
    details.available_engine_api_dependency_keys,
  )
    ? details.available_engine_api_dependency_keys
    : [];
  const requestedSettingsKeys = Array.isArray(details.requested_settings_keys)
    ? details.requested_settings_keys
    : [];
  const matchedRequestedSettingsKeys = Array.isArray(details.matched_requested_settings_keys)
    ? details.matched_requested_settings_keys
    : [];
  const missingRequestedSettingsKeys = Array.isArray(details.missing_requested_settings_keys)
    ? details.missing_requested_settings_keys
    : [];
  const requestedGemNames = Array.isArray(details.requested_gem_names)
    ? details.requested_gem_names
    : [];
  const matchedRequestedGemNames = Array.isArray(details.matched_requested_gem_names)
    ? details.matched_requested_gem_names
    : [];
  const missingRequestedGemNames = Array.isArray(details.missing_requested_gem_names)
    ? details.missing_requested_gem_names
    : [];
  const requestedProjectConfigKeys = Array.isArray(details.requested_project_config_keys)
    ? details.requested_project_config_keys
    : [];
  const matchedRequestedProjectConfigKeys = Array.isArray(
    details.matched_requested_project_config_keys,
  )
    ? details.matched_requested_project_config_keys
    : [];
  const missingRequestedProjectConfigKeys = Array.isArray(
    details.missing_requested_project_config_keys,
  )
    ? details.missing_requested_project_config_keys
    : [];

  return (
    <section style={{ marginTop: 16 }}>
      <h4 style={summaryCardHeadingStyle}>{title}</h4>
      <div style={{ ...summaryCardGridStyle, marginTop: 12 }}>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Manifest Surface</h4>
          <SummaryFacts>
            <SummaryFact label="Inspection surface">
              {details.inspection_surface ?? "unknown"}
            </SummaryFact>
            <SummaryFact label="Manifest path" copyValue={details.project_manifest_path ?? undefined}>
              {details.project_manifest_path ?? "not recorded"}
            </SummaryFact>
            <SummaryFact label="Evidence markers">
              {renderJoinedValue(details.inspection_evidence)}
            </SummaryFact>
            <SummaryFact label="Discovered config keys">
              {renderJoinedValue(availableProjectConfigKeys)}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Config Evidence</h4>
          <SummaryFacts>
            <SummaryFact label="Selection mode">
              {details.project_config_selection_mode ?? "not recorded"}
            </SummaryFact>
            <SummaryFact label="Requested config keys">
              {renderJoinedValue(requestedProjectConfigKeys)}
            </SummaryFact>
            <SummaryFact label="Matched config keys">
              {renderJoinedValue(matchedRequestedProjectConfigKeys)}
            </SummaryFact>
            <SummaryFact label="Missing config keys">
              {renderJoinedValue(missingRequestedProjectConfigKeys)}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Gem Evidence</h4>
          <SummaryFacts>
            <SummaryFact label="Discovered Gems">
              {renderJoinedValue(availableGemNames)}
            </SummaryFact>
            <SummaryFact label="Requested Gem names">
              {renderJoinedValue(requestedGemNames)}
            </SummaryFact>
            <SummaryFact label="Matched Gem names">
              {renderJoinedValue(matchedRequestedGemNames)}
            </SummaryFact>
            <SummaryFact label="Missing Gem names">
              {renderJoinedValue(missingRequestedGemNames)}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Settings Evidence</h4>
          <SummaryFacts>
            <SummaryFact label="Settings source">
              {details.settings_evidence_source ?? "not recorded"}
            </SummaryFact>
            <SummaryFact label="Requested settings keys">
              {renderJoinedValue(requestedSettingsKeys)}
            </SummaryFact>
            <SummaryFact label="Matched settings keys">
              {renderJoinedValue(matchedRequestedSettingsKeys)}
            </SummaryFact>
            <SummaryFact label="Missing settings keys">
              {renderJoinedValue(missingRequestedSettingsKeys)}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Project Metadata</h4>
          <SummaryFacts>
            <SummaryFact label="Project origin type">
              {details.available_project_origin_type ?? "null"}
            </SummaryFact>
            <SummaryFact label="Project ID">
              {details.available_project_id ?? "not recorded"}
            </SummaryFact>
            <SummaryFact label="Display name">
              {details.available_display_name ?? "not recorded"}
            </SummaryFact>
            <SummaryFact label="Restricted platform">
              {details.available_restricted_platform_name ?? "not recorded"}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Compatibility And Tags</h4>
          <SummaryFacts>
            <SummaryFact label="Compatible engines">
              {renderJoinedValue(availableCompatibleEngines)}
            </SummaryFact>
            <SummaryFact label="Engine API dependency keys">
              {renderJoinedValue(availableEngineApiDependencyKeys)}
            </SummaryFact>
            <SummaryFact label="User tags">
              {renderJoinedValue(availableUserTags)}
            </SummaryFact>
            <SummaryFact label="Icon path">
              {details.available_icon_path ?? "not recorded"}
            </SummaryFact>
          </SummaryFacts>
        </article>
      </div>
    </section>
  );
}
