import type { CSSProperties, ReactNode } from "react";

import MissionTruthRail from "../MissionTruthRail";
import type { PlacementProofOnlyReviewSnapshot } from "../../lib/promptPlacementProofOnlyReview";
import type {
  AdaptersResponse,
  AssetForgeBlenderStatusRecord,
  AssetForgeProviderStatusRecord,
  AssetForgeTaskRecord,
  O3DEBridgeStatus,
  ReadinessStatus,
  ToolPolicy,
} from "../../types/contracts";
import type { O3DEProjectProfile } from "../../types/o3deProjectProfiles";

type AssetForgeBlenderCockpitProps = {
  projectProfile?: O3DEProjectProfile;
  taskModel?: AssetForgeTaskRecord | null;
  providerStatus?: AssetForgeProviderStatusRecord | null;
  blenderStatus?: AssetForgeBlenderStatusRecord | null;
  bridgeStatus?: O3DEBridgeStatus | null;
  adapters?: AdaptersResponse | null;
  readiness?: ReadinessStatus | null;
  policies?: ToolPolicy[];
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
  latestPlacementProofOnlyReview?: PlacementProofOnlyReviewSnapshot | null;
  onOpenPromptStudio?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  onOpenPromptSessionDetail?: (promptId: string) => void;
  onOpenExecutionDetail?: (executionId: string) => void;
  onOpenArtifactDetail?: (artifactId: string) => void;
  onOpenRunDetail?: (runId: string) => void;
};

type TruthTone =
  | "demo"
  | "plan-only"
  | "preflight-only"
  | "proof-only"
  | "blocked"
  | "review"
  | "safe";

const stageItems = [
  { label: "Describe", truth: "plan-only" as TruthTone },
  { label: "Candidate", truth: "demo" as TruthTone },
  { label: "Preflight", truth: "preflight-only" as TruthTone },
  { label: "Stage Plan", truth: "plan-only" as TruthTone },
  { label: "Stage Write", truth: "proof-only" as TruthTone },
  { label: "Readback", truth: "review" as TruthTone },
  { label: "Placement Proof", truth: "proof-only" as TruthTone },
  { label: "Review", truth: "review" as TruthTone },
];

const toolItems = [
  { label: "Select", shortcut: "1", truth: "demo" as TruthTone },
  { label: "Move", shortcut: "2", truth: "demo" as TruthTone },
  { label: "Rotate", shortcut: "3", truth: "demo" as TruthTone },
  { label: "Scale", shortcut: "4", truth: "demo" as TruthTone },
  { label: "Set Origin", shortcut: "5", truth: "plan-only" as TruthTone },
  { label: "Align to Ground", shortcut: "6", truth: "plan-only" as TruthTone },
  { label: "Apply Transforms", shortcut: "7", truth: "preflight-only" as TruthTone },
  { label: "Measure", shortcut: "8", truth: "preflight-only" as TruthTone },
  { label: "Inspect Mesh", shortcut: "9", truth: "blocked" as TruthTone },
];

const outlinerItems = [
  { label: "Asset Root", detail: "candidate scene root", truth: "demo" as TruthTone },
  { label: "Mesh_LOD0", detail: "primary mesh preview", truth: "demo" as TruthTone },
  { label: "Mesh_LOD1 planned", detail: "future optimization", truth: "plan-only" as TruthTone },
  { label: "Materials", detail: "read-only / blocked mutation", truth: "blocked" as TruthTone },
  { label: "Textures", detail: "read-only references", truth: "preflight-only" as TruthTone },
  { label: "Collision planned", detail: "future bounded generation", truth: "plan-only" as TruthTone },
  { label: "Export Manifest planned", detail: "future packaging", truth: "plan-only" as TruthTone },
];

function truthToneStyle(truth: TruthTone): CSSProperties {
  switch (truth) {
    case "demo":
      return {
        borderColor: "rgba(92, 170, 255, 0.55)",
        background: "rgba(59, 130, 246, 0.16)",
        color: "var(--app-text-color)",
      };
    case "plan-only":
      return {
        borderColor: "rgba(148, 163, 184, 0.62)",
        background: "rgba(100, 116, 139, 0.16)",
        color: "var(--app-text-color)",
      };
    case "preflight-only":
      return {
        borderColor: "rgba(245, 184, 72, 0.72)",
        background: "rgba(245, 184, 72, 0.16)",
        color: "var(--app-text-color)",
      };
    case "proof-only":
      return {
        borderColor: "rgba(168, 122, 255, 0.72)",
        background: "rgba(124, 58, 237, 0.16)",
        color: "var(--app-text-color)",
      };
    case "review":
      return {
        borderColor: "rgba(45, 212, 191, 0.55)",
        background: "rgba(20, 184, 166, 0.14)",
        color: "var(--app-text-color)",
      };
    case "safe":
      return {
        borderColor: "rgba(74, 222, 128, 0.5)",
        background: "rgba(34, 197, 94, 0.12)",
        color: "var(--app-text-color)",
      };
    case "blocked":
    default:
      return {
        borderColor: "rgba(248, 113, 113, 0.72)",
        background: "rgba(220, 38, 38, 0.15)",
        color: "var(--app-text-color)",
      };
  }
}

function TruthBadge({ truth }: { truth: TruthTone }) {
  return (
    <span style={{ ...styles.truthBadge, ...truthToneStyle(truth) }}>
      {truth}
    </span>
  );
}

function EditorRegion({
  title,
  subtitle,
  label,
  children,
  actions,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  label?: string;
  children: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section style={styles.region} aria-label={title}>
      <header style={styles.regionHeader}>
        <div style={styles.regionTitleGroup}>
          <strong style={styles.regionTitle}>{title}</strong>
          {subtitle ? <span style={styles.regionSubtitle}>{subtitle}</span> : null}
        </div>
        <div style={styles.regionActions}>
          {label ? <span style={styles.regionLabel}>{label}</span> : null}
          {actions}
        </div>
      </header>
      <div style={compact ? styles.regionBodyCompact : styles.regionBody}>
        {children}
      </div>
    </section>
  );
}

function getCandidateSummary(taskModel?: AssetForgeTaskRecord | null) {
  const firstCandidate = taskModel?.candidates?.[0];
  return {
    id: firstCandidate?.candidate_id ?? "candidate-a",
    name: firstCandidate?.display_name ?? "Weathered Ivy Arch",
    status: firstCandidate?.status ?? "demo",
    notes: firstCandidate?.preview_notes ?? "Demo candidate placeholder. No provider generation has executed.",
    readiness: firstCandidate?.readiness_placeholder ?? "Readiness pending proof-only review.",
    triangles: firstCandidate?.estimated_triangles ?? "triangle estimate unavailable",
  };
}

function providerSummary(providerStatus?: AssetForgeProviderStatusRecord | null): string {
  if (!providerStatus) {
    return "No provider status loaded; provider generation remains blocked.";
  }
  return `Provider mode ${providerStatus.provider_mode}; configuration ${
    providerStatus.configuration_ready ? "ready" : "not ready"
  }; generation ${providerStatus.generation_execution_status}.`;
}

function blenderSummary(blenderStatus?: AssetForgeBlenderStatusRecord | null): string {
  if (!blenderStatus) {
    return "No Blender status loaded; Blender execution remains blocked.";
  }
  const version = blenderStatus.version ?? "version unavailable";
  return `Blender ${blenderStatus.executable_found ? "detected" : "missing"} via ${
    blenderStatus.detection_source
  }; ${version}; prep ${blenderStatus.blender_prep_execution_status}.`;
}

export default function AssetForgeBlenderCockpit({
  projectProfile,
  taskModel,
  providerStatus,
  blenderStatus,
  bridgeStatus,
  adapters,
  readiness,
  latestRunId,
  latestExecutionId,
  latestArtifactId,
  latestPlacementProofOnlyReview,
  onOpenPromptStudio,
  onLaunchInspectTemplate,
  onLaunchPlacementProofTemplate,
  onOpenRuntimeOverview,
  onOpenRecords,
  onViewLatestRun,
  onViewExecution,
  onViewArtifact,
  onViewEvidence,
  onOpenPromptSessionDetail,
  onOpenExecutionDetail,
  onOpenArtifactDetail,
  onOpenRunDetail,
}: AssetForgeBlenderCockpitProps) {
  const candidate = getCandidateSummary(taskModel);

  return (
    <section style={styles.shell} aria-label="Asset Forge Blender-style editor cockpit">
      <div style={styles.topbar}>
        <div style={styles.identity}>
          <span style={styles.eyebrow}>Asset Forge Editor Mode</span>
          <h2 style={styles.title}>Asset Forge Studio</h2>
          <p style={styles.subtitle}>
            Blender/Unreal-style editor cockpit for bounded asset review, staging, readback, and proof-only placement.
          </p>
        </div>
        <div style={styles.commandRow}>
          <button type="button" onClick={onLaunchInspectTemplate} style={styles.commandButton}>
            Inspect / Preflight
          </button>
          <button type="button" onClick={onLaunchPlacementProofTemplate} style={styles.commandButtonStrong}>
            Load placement proof-only template in Prompt Studio
          </button>
          <button type="button" onClick={onOpenPromptStudio} style={styles.commandButton}>
            Open Prompt Studio
          </button>
          <button type="button" onClick={onOpenRecords} style={styles.commandButton}>
            Open Records
          </button>
        </div>
      </div>

      <nav style={styles.stageStrip} aria-label="Asset Forge workflow stages">
        {stageItems.map((stage) => (
          <div key={stage.label} style={styles.stagePill}>
            <span>{stage.label}</span>
            <TruthBadge truth={stage.truth} />
          </div>
        ))}
      </nav>

      <div style={styles.editorGrid}>
        <aside style={styles.leftArea} aria-label="Asset Forge left tool and outliner area">
          <EditorRegion title="Tool Shelf" subtitle="Bounded editor tools" label="LEFT" compact>
            <div style={styles.toolList}>
              {toolItems.map((tool) => (
                <button key={tool.label} type="button" style={styles.toolButton}>
                  <span style={styles.toolText}>
                    <strong>{tool.label}</strong>
                    <small>{tool.shortcut}</small>
                  </span>
                  <TruthBadge truth={tool.truth} />
                </button>
              ))}
            </div>
          </EditorRegion>

          <EditorRegion title="Candidate Browser" subtitle="Selected variant" label="LEFT" compact>
            <article style={styles.candidateCard}>
              <div style={styles.cardHeader}>
                <strong>{candidate.name}</strong>
                <TruthBadge truth="demo" />
              </div>
              <p style={styles.compactText}>{candidate.notes}</p>
              <p style={styles.metaLine}>{candidate.triangles}</p>
              <p style={styles.metaLine}>{candidate.readiness}</p>
            </article>
          </EditorRegion>

          <EditorRegion title="Asset Outliner" subtitle="Scene-like asset structure" label="LEFT" compact>
            <div style={styles.outliner}>
              {outlinerItems.map((item) => (
                <div key={item.label} style={styles.outlinerItem}>
                  <div style={styles.outlinerText}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <TruthBadge truth={item.truth} />
                </div>
              ))}
            </div>
          </EditorRegion>
        </aside>

        <main style={styles.centerArea} aria-label="Asset Forge center viewport area">
          <EditorRegion
            title="3D Viewport"
            subtitle="Dominant asset preview editor"
            label="CENTER"
            actions={<TruthBadge truth="demo" />}
          >
            <div style={styles.viewportToolbar}>
              {["Solid", "Material Preview", "Wireframe", "O3DE Preview"].map((mode) => (
                <button key={mode} type="button" style={styles.viewportButton}>
                  {mode}
                </button>
              ))}
            </div>
            <div style={styles.viewport}>
              <div style={styles.gridOverlay} />
              <div style={styles.axisBadge}>Axis: Z-up demo</div>
              <div style={styles.viewBadge}>Solid view / no real model loaded</div>
              <div style={styles.previewObject} />
              <div style={styles.viewportNotice}>
                Demo viewport — no provider generation, Blender execution, Asset Processor execution, or O3DE mutation admitted.
              </div>
            </div>
            <div style={styles.viewportFooter}>
              {["Orbit", "Pan", "Zoom", "Frame", "Top", "Front", "Side"].map((control) => (
                <button key={control} type="button" style={styles.footerButton}>
                  {control}
                </button>
              ))}
            </div>
          </EditorRegion>
        </main>

        <aside style={styles.rightArea} aria-label="Asset Forge right inspector area">
          <EditorRegion title="Inspector" subtitle="Selected candidate and safety details" label="RIGHT">
            <div style={styles.inspectorStack}>
              <InspectorRow label="Candidate" value={`${candidate.name} (${candidate.id})`} />
              <InspectorRow label="Provider" value={providerSummary(providerStatus)} tone="blocked" />
              <InspectorRow label="Blender" value={blenderSummary(blenderStatus)} tone="preflight-only" />
              <InspectorRow label="Target component" value="Mesh / proof-only candidate target" />
              <InspectorRow label="Placement execution" value="blocked; execution_admitted=false" tone="blocked" />
              <InspectorRow label="Placement write" value="blocked; placement_write_admitted=false" tone="blocked" />
              <InspectorRow label="Next unlock" value="exact admission corridor with readback and revert/restore proof" />
            </div>
          </EditorRegion>

          <EditorRegion title="Mission Truth" subtitle="Compact safety rail" label="RIGHT">
            <MissionTruthRail
              locationLabel="Asset Forge"
              projectLabel={projectProfile?.name ?? "unknown project"}
              projectPath={projectProfile?.projectRoot ?? bridgeStatus?.project_root ?? null}
              bridgeStatus={bridgeStatus}
              adapters={adapters}
              readiness={readiness}
              currentExecutionMode={readiness?.execution_mode ?? null}
              executionAdmitted={false}
              placementWriteAdmitted={false}
              mutationOccurred={false}
              latestRunId={latestRunId ?? null}
              latestExecutionId={latestExecutionId ?? null}
              latestArtifactId={latestArtifactId ?? null}
              latestPlacementProofOnlyReview={latestPlacementProofOnlyReview ?? null}
              nextSafeAction="Load a proof-only placement prompt template, preview the plan, then review persisted evidence."
              onViewLatestRun={onViewLatestRun}
              onViewExecution={onViewExecution}
              onViewArtifact={onViewArtifact}
              onViewEvidence={onViewEvidence}
              onOpenPromptStudio={onOpenPromptStudio}
              onOpenRuntimeOverview={onOpenRuntimeOverview}
              onOpenRecords={onOpenRecords}
              onOpenPromptSessionDetail={onOpenPromptSessionDetail}
              onOpenExecutionDetail={onOpenExecutionDetail}
              onOpenArtifactDetail={onOpenArtifactDetail}
              onOpenRunDetail={onOpenRunDetail}
            />
          </EditorRegion>
        </aside>
      </div>

      <footer style={styles.bottomDrawer} aria-label="Asset Forge bottom evidence prompt and log drawer">
        <EditorRegion title="Evidence / Prompts / Logs" subtitle="Content drawer" label="BOTTOM">
          <div style={styles.drawerGrid}>
            <section style={styles.drawerSection}>
              <strong>Evidence shortcuts</strong>
              <div style={styles.drawerButtons}>
                <button type="button" onClick={onViewLatestRun} style={styles.commandButton}>View latest run</button>
                <button type="button" onClick={onViewExecution} style={styles.commandButton}>View execution</button>
                <button type="button" onClick={onViewArtifact} style={styles.commandButton}>View artifact</button>
                <button type="button" onClick={onViewEvidence} style={styles.commandButton}>View evidence</button>
              </div>
              <p style={styles.compactText}>
                Latest run: <code>{latestRunId ?? "not selected"}</code>
              </p>
              <p style={styles.compactText}>
                Latest execution: <code>{latestExecutionId ?? "not selected"}</code>
              </p>
              <p style={styles.compactText}>
                Latest artifact: <code>{latestArtifactId ?? "not selected"}</code>
              </p>
            </section>

            <section style={styles.drawerSection}>
              <strong>Proof-only prompt template</strong>
              <p style={styles.compactText}>
                In the editor, create a placement proof-only candidate with candidate_id "candidate-a",
                candidate_label "Weathered Ivy Arch", staged_source_relative_path
                "Assets/Generated/asset_forge/candidate_a/candidate_a.glb", target_level_relative_path
                "Levels/BridgeLevel01/BridgeLevel01.prefab", target_entity_name "AssetForgeCandidateA",
                target_component "Mesh", stage_write_evidence_reference "packet-10/stage-write-evidence.json",
                stage_write_readback_reference "packet-10/readback-evidence.json",
                stage_write_readback_status "succeeded", approval_state "approved", and approval_note
                "bounded proof-only review".
              </p>
              <div style={styles.badgeRow}>
                <TruthBadge truth="proof-only" />
                <TruthBadge truth="blocked" />
                <span style={styles.safetyText}>non-mutating / fail-closed / real placement not admitted</span>
              </div>
            </section>

            <section style={styles.drawerSection}>
              <strong>Blocked execution log</strong>
              <ul style={styles.blockedList}>
                <li>Provider generation blocked.</li>
                <li>Blender execution blocked.</li>
                <li>Asset Processor execution blocked.</li>
                <li>Placement runtime execution blocked.</li>
                <li>Material and prefab mutation blocked.</li>
              </ul>
            </section>
          </div>
        </EditorRegion>
      </footer>
    </section>
  );
}

function InspectorRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: TruthTone;
}) {
  return (
    <div style={{ ...styles.inspectorRow, ...(tone ? truthToneStyle(tone) : null) }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  shell: {
    display: "grid",
    gridTemplateRows: "auto auto minmax(0, 1fr) minmax(160px, 0.28fr)",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    color: "var(--app-text-color)",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    padding: "12px 14px",
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-card-radius)",
    background: "var(--app-panel-bg)",
    boxShadow: "var(--app-shadow-soft)",
    minWidth: 0,
  },
  identity: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--app-muted-color)",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: 0,
    color: "var(--app-muted-color)",
    fontSize: 13,
  },
  commandRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  commandButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 9,
    padding: "7px 10px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
    boxShadow: "var(--app-shadow-soft)",
  },
  commandButtonStrong: {
    border: "1px solid var(--app-accent)",
    borderRadius: 9,
    padding: "7px 10px",
    background: "color-mix(in srgb, var(--app-accent) 20%, var(--app-panel-bg-alt))",
    color: "var(--app-text-color)",
    cursor: "pointer",
    boxShadow: "var(--app-shadow-soft)",
    fontWeight: 700,
  },
  stageStrip: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "4px 2px 6px",
    minWidth: 0,
  },
  stagePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "6px 10px",
    background: "var(--app-panel-bg)",
    boxShadow: "var(--app-shadow-soft)",
    fontSize: 12,
  },
  editorGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(250px, 0.24fr) minmax(520px, 1fr) minmax(300px, 0.28fr)",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  leftArea: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
  },
  centerArea: {
    display: "grid",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  rightArea: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
  },
  bottomDrawer: {
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  region: {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-card-radius)",
    background: "var(--app-panel-bg)",
    boxShadow: "var(--app-shadow-soft)",
  },
  regionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 10px",
    borderBottom: "1px solid var(--app-panel-border)",
    background: "var(--app-panel-bg-alt)",
    minWidth: 0,
  },
  regionTitleGroup: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  regionTitle: {
    fontSize: 13,
  },
  regionSubtitle: {
    fontSize: 12,
    color: "var(--app-muted-color)",
    overflowWrap: "anywhere",
  },
  regionActions: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  regionLabel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 7px",
    fontSize: 10,
    color: "var(--app-muted-color)",
    textTransform: "uppercase",
  },
  regionBody: {
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
    padding: 10,
  },
  regionBodyCompact: {
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
    padding: 8,
  },
  truthBadge: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid",
    borderRadius: 999,
    padding: "2px 7px",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.03em",
  },
  toolList: {
    display: "grid",
    gap: 7,
  },
  toolButton: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "7px 8px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
    minWidth: 0,
  },
  toolText: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  candidateCard: {
    display: "grid",
    gap: 8,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--app-panel-bg-alt)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  compactText: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-muted-color)",
    overflowWrap: "anywhere",
  },
  metaLine: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-text-color)",
    overflowWrap: "anywhere",
  },
  outliner: {
    display: "grid",
    gap: 6,
  },
  outlinerItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "7px 8px",
    background: "var(--app-panel-bg-alt)",
    minWidth: 0,
  },
  outlinerText: {
    display: "grid",
    gap: 2,
    minWidth: 0,
    fontSize: 12,
  },
  viewportToolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  viewportButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "5px 10px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
  },
  viewport: {
    position: "relative",
    minHeight: 420,
    height: "min(58vh, 620px)",
    border: "1px solid var(--app-panel-border)",
    borderRadius: 12,
    overflow: "hidden",
    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.86))",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
  },
  axisBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    border: "1px solid rgba(148, 163, 184, 0.4)",
    borderRadius: 999,
    padding: "5px 10px",
    color: "#e2e8f0",
    background: "rgba(2, 6, 23, 0.72)",
  },
  viewBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    border: "1px solid rgba(92, 170, 255, 0.58)",
    borderRadius: 999,
    padding: "5px 10px",
    color: "#e0f2fe",
    background: "rgba(14, 116, 144, 0.32)",
  },
  previewObject: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 220,
    height: 180,
    transform: "translate(-50%, -50%) rotate(12deg)",
    borderRadius: "48% 52% 46% 54%",
    border: "2px solid rgba(203, 213, 225, 0.72)",
    background:
      "radial-gradient(circle at 35% 30%, rgba(226, 232, 240, 0.36), rgba(100, 116, 139, 0.32) 42%, rgba(30, 41, 59, 0.58) 100%)",
    boxShadow: "0 28px 70px rgba(2, 6, 23, 0.45)",
  },
  viewportNotice: {
    position: "absolute",
    left: 16,
    bottom: 16,
    maxWidth: "calc(100% - 32px)",
    borderRadius: 10,
    padding: "8px 10px",
    color: "#f8fafc",
    background: "rgba(2, 6, 23, 0.78)",
    overflowWrap: "anywhere",
    fontSize: 12,
  },
  viewportFooter: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  footerButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "5px 9px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
  },
  inspectorStack: {
    display: "grid",
    gap: 8,
  },
  inspectorRow: {
    display: "grid",
    gap: 4,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "8px 9px",
    background: "var(--app-panel-bg-alt)",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  drawerGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.8fr) minmax(320px, 1.2fr) minmax(220px, 0.8fr)",
    gap: 12,
    minWidth: 0,
  },
  drawerSection: {
    display: "grid",
    gap: 8,
    minWidth: 0,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--app-panel-bg-alt)",
  },
  drawerButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
  },
  safetyText: {
    fontSize: 12,
    color: "var(--app-muted-color)",
  },
  blockedList: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 5,
    fontSize: 12,
    color: "var(--app-muted-color)",
  },
} satisfies Record<string, CSSProperties>;
