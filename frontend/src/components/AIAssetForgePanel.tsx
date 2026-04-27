import { useState, type CSSProperties } from "react";

import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AIAssetForgePanelProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
};

const defaultCreativePrompt =
  "Create a worn wooden tavern chair with green cushions for a medieval village.";

type ForgeViewMode = "preview" | "products" | "review";
type ForgeOrbitView = "front" | "side" | "top" | "orbit";
type ForgeRenderMode = "material" | "wireframe" | "proof";
type ForgeControlMode = "plan" | "readback" | "review" | "blocked";

const forgeStages = [
  {
    label: "Plan request",
    detail: "Toolbench converts creative intent into typed adapter requests and review goals.",
    state: "active",
  },
  {
    label: "Generation corridor",
    detail: "Future admitted corridor only; this control-surface slice does not run generation.",
    state: "blocked",
  },
  {
    label: "Normalize corridor",
    detail: "Toolbench normalization stays typed and O3DE-native with no external DCC assumption.",
    state: "design",
  },
  {
    label: "Stage and process",
    detail: "Source staging and Asset Processor execution remain blocked unless later admitted.",
    state: "blocked",
  },
  {
    label: "Readback",
    detail: "Phase 9 read-only Asset Database and Asset Catalog evidence corridor.",
    state: "active",
  },
  {
    label: "Review packet",
    detail: "Operator packet tracks provenance, warnings, and decision state before future placement.",
    state: "active",
  },
  {
    label: "Assign and place",
    detail: "Future admitted corridor only after review and explicit approval.",
    state: "blocked",
  },
];

const o3deFeatureRows = [
  {
    label: "Typed backend adapters",
    state: "required",
    detail: "Backend calls stay typed; no arbitrary Python/shell/O3DE script passthrough.",
  },
  {
    label: "Asset Processor",
    state: "required",
    detail: "Process staged source assets before any product is treated as usable when admitted.",
  },
  {
    label: "Asset Catalog",
    state: "checked",
    detail: "Cross-check product presence for runtime availability evidence.",
  },
  {
    label: "Asset Database",
    state: "checked",
    detail: "Read source, product, job, and dependency rows through Phase 9.",
  },
  {
    label: "Entities and Prefabs",
    state: "future gate",
    detail: "Assignment and placement wait for admitted entity corridors.",
  },
  {
    label: "Components",
    state: "future gate",
    detail: "Renderer, mesh, collider, and metadata components require exact admission.",
  },
  {
    label: "Materials and Textures",
    state: "reviewed",
    detail: "Preview material outputs and warnings before project use.",
  },
  {
    label: "Physics and Collision",
    state: "planned",
    detail: "Track collider, scale, pivot, and LOD needs in the review packet.",
  },
  {
    label: "Lighting and Camera",
    state: "viewer only",
    detail: "Use app-side preview controls without mutating O3DE scene lighting.",
  },
  {
    label: "Script and Behavior",
    state: "blocked",
    detail: "Generated assets do not add arbitrary scripts or editor Python.",
  },
  {
    label: "Build and Test",
    state: "planned",
    detail: "Record validation commands and readiness before production admission.",
  },
];

function inferAssetType(prompt: string): string {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("chair") || normalized.includes("lantern") || normalized.includes("bridge")) {
    return "prop";
  }
  if (normalized.includes("character") || normalized.includes("creature")) {
    return "character";
  }
  if (normalized.includes("building") || normalized.includes("house") || normalized.includes("tavern")) {
    return "environment set piece";
  }
  return "generated asset";
}

function inferStyleProfile(prompt: string): string {
  const normalized = prompt.toLowerCase();
  const styles = [
    normalized.includes("medieval") ? "medieval" : null,
    normalized.includes("worn") ? "worn" : null,
    normalized.includes("wood") || normalized.includes("wooden") ? "wood" : null,
    normalized.includes("stone") ? "stone" : null,
    normalized.includes("moss") || normalized.includes("mossy") ? "mossy" : null,
    normalized.includes("low-poly") ? "low-poly" : null,
  ].filter(Boolean);

  return styles.length > 0 ? styles.join(", ") : "operator-described style";
}

export default function AIAssetForgePanel({
  projectProfile,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
}: AIAssetForgePanelProps) {
  const [creativePrompt, setCreativePrompt] = useState(defaultCreativePrompt);
  const [assetType, setAssetType] = useState(() => inferAssetType(defaultCreativePrompt));
  const [styleProfile, setStyleProfile] = useState(() => inferStyleProfile(defaultCreativePrompt));
  const [qualityProfile, setQualityProfile] = useState("prototype");
  const [scaleHint, setScaleHint] = useState("chair-sized prop");
  const [targetFormat, setTargetFormat] = useState("glb");
  const [referenceImagePath, setReferenceImagePath] = useState("");
  const [stagingFolder, setStagingFolder] = useState("Assets/Generated/<asset_slug>/");
  const [viewMode, setViewMode] = useState<ForgeViewMode>("preview");
  const [orbitView, setOrbitView] = useState<ForgeOrbitView>("orbit");
  const [renderMode, setRenderMode] = useState<ForgeRenderMode>("material");
  const [controlMode, setControlMode] = useState<ForgeControlMode>("review");
  const [zoomLevel, setZoomLevel] = useState(72);
  const [lightingLevel, setLightingLevel] = useState(64);
  const activeProjectName = projectProfile?.name ?? "Select an O3DE project";
  const projectRoot = projectProfile?.projectRoot ?? "Project root required before staging";

  const internalRequestRows = [
    ["creative_prompt", creativePrompt],
    ["asset_type", assetType],
    ["style_profile", styleProfile],
    ["quality_profile", qualityProfile],
    ["scale_hint", scaleHint],
    ["target_format", targetFormat],
    ["reference_image_path", referenceImagePath || "optional"],
    ["project_root", projectRoot],
    ["staging_folder", stagingFolder],
    ["requires_operator_review", "true"],
  ];

  function updateCreativePrompt(value: string): void {
    setCreativePrompt(value);
    setAssetType(inferAssetType(value));
    setStyleProfile(inferStyleProfile(value));
  }

  return (
    <section aria-label="AI Asset Forge" style={forgeShellStyle}>
      <div style={forgeHeaderStyle}>
        <div>
          <span style={eyebrowStyle}>O3DE AI Asset Forge</span>
          <strong style={titleStyle}>Creative prompts to O3DE-native Toolbench corridors</strong>
          <p style={mutedParagraphStyle}>
            Describe the asset naturally. Forge turns the prompt into typed Toolbench planning,
            O3DE validation/readback corridors, and operator review packet work.
          </p>
        </div>
        <span style={reviewPillStyle}>Control-surface slice: non-mutating</span>
      </div>

      <div style={forgeGridStyle}>
        <section style={promptPanelStyle} aria-label="Forge creative prompt">
          <label style={fieldLabelStyle}>
            Creative prompt
            <textarea
              value={creativePrompt}
              onChange={(event) => updateCreativePrompt(event.currentTarget.value)}
              rows={5}
              maxLength={600}
              style={promptTextAreaStyle}
            />
          </label>
          <div style={promptComparisonStyle}>
            <span>
              <strong>Use</strong>
              Natural creative intent such as assets, style, material, scale, and references.
            </span>
            <span>
              <strong>Avoid</strong>
              Engine-control wording such as assetdb queries, catalog checks, or forced placement.
            </span>
          </div>
          <div style={buttonRowStyle}>
            {onOpenPromptStudio ? (
              <button type="button" onClick={onOpenPromptStudio} style={primaryButtonStyle}>
                Open Prompt Studio
              </button>
            ) : null}
            {onOpenBuilder ? (
              <button type="button" onClick={onOpenBuilder} style={secondaryButtonStyle}>
                Turn into Builder tasks
              </button>
            ) : null}
          </div>
        </section>

        <section style={requestPanelStyle} aria-label="Forge Toolbench edit tools">
          <div>
            <span style={eyebrowStyle}>Toolbench edit tools</span>
            <p style={mutedParagraphStyle}>
              Shape the structured request before any future admitted generation, staging, or placement mutation.
            </p>
          </div>
          <div style={editGridStyle}>
            <label style={compactFieldLabelStyle}>
              Asset type
              <input value={assetType} onChange={(event) => setAssetType(event.currentTarget.value)} style={compactInputStyle} />
            </label>
            <label style={compactFieldLabelStyle}>
              Style profile
              <input value={styleProfile} onChange={(event) => setStyleProfile(event.currentTarget.value)} style={compactInputStyle} />
            </label>
            <label style={compactFieldLabelStyle}>
              Quality profile
              <select value={qualityProfile} onChange={(event) => setQualityProfile(event.currentTarget.value)} style={compactInputStyle}>
                <option value="prototype">prototype</option>
                <option value="internal review">internal review</option>
                <option value="production candidate">production candidate</option>
              </select>
            </label>
            <label style={compactFieldLabelStyle}>
              Scale hint
              <input value={scaleHint} onChange={(event) => setScaleHint(event.currentTarget.value)} style={compactInputStyle} />
            </label>
            <label style={compactFieldLabelStyle}>
              Target format
              <select value={targetFormat} onChange={(event) => setTargetFormat(event.currentTarget.value)} style={compactInputStyle}>
                <option value="glb">glb</option>
                <option value="fbx">fbx</option>
                <option value="obj">obj</option>
              </select>
            </label>
            <label style={compactFieldLabelStyle}>
              Reference image path
              <input
                value={referenceImagePath}
                onChange={(event) => setReferenceImagePath(event.currentTarget.value)}
                placeholder="optional local reference"
                style={compactInputStyle}
              />
            </label>
            <label style={wideFieldLabelStyle}>
              Staging folder
              <input value={stagingFolder} onChange={(event) => setStagingFolder(event.currentTarget.value)} style={compactInputStyle} />
            </label>
          </div>
        </section>
      </div>

      <section style={requestPanelStyle} aria-label="Forge internal request preview">
        <div>
          <span style={eyebrowStyle}>Internal request preview</span>
          <p style={mutedParagraphStyle}>
            The app should translate creative input into structured fields before any generation or O3DE work.
          </p>
        </div>
        <dl style={requestGridStyle}>
          {internalRequestRows.map(([label, value]) => (
            <div key={label} style={requestRowStyle}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section style={viewerShellStyle} aria-label="AI Asset Forge dedicated viewer">
        <div style={viewerHeaderStyle}>
          <div>
            <span style={eyebrowStyle}>Dedicated viewer</span>
            <strong>Toolbench evidence bay</strong>
            <p style={mutedParagraphStyle}>
              Preview the selected candidate with proof status, product outputs, and blocked-corridor
              guidance before any scene placement work begins.
            </p>
          </div>
          <span style={projectPillStyle}>triposr_chair_001 evidence</span>
        </div>

        <div style={toolSuiteStyle} aria-label="Forge control, view, and edit tools">
          <section style={toolSuitePanelStyle} aria-label="Forge control tools">
            <span style={eyebrowStyle}>Toolbench control tools</span>
            <div style={segmentedGridStyle}>
              {(["plan", "readback", "review", "blocked"] as ForgeControlMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={controlMode === mode}
                  onClick={() => setControlMode(mode)}
                  style={controlMode === mode ? activeSegmentButtonStyle : segmentButtonStyle}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div style={controlActionGridStyle}>
              <button type="button" style={primaryButtonStyle}>Draft typed request</button>
              <button type="button" style={secondaryButtonStyle}>Draft readback check</button>
              <button type="button" style={secondaryButtonStyle}>Open operator packet</button>
              <button type="button" disabled title="Placement requires review and a later admitted corridor." style={disabledButtonStyle}>
                Place in level
              </button>
            </div>
          </section>

          <section style={toolSuitePanelStyle} aria-label="Forge view tools">
            <span style={eyebrowStyle}>View tools</span>
            <div style={segmentedGridStyle}>
              {(["preview", "products", "review"] as ForgeViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  style={viewMode === mode ? activeSegmentButtonStyle : segmentButtonStyle}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div style={segmentedGridStyle}>
              {(["front", "side", "top", "orbit"] as ForgeOrbitView[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={orbitView === mode}
                  onClick={() => setOrbitView(mode)}
                  style={orbitView === mode ? activeSegmentButtonStyle : segmentButtonStyle}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div style={segmentedGridStyle}>
              {(["material", "wireframe", "proof"] as ForgeRenderMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={renderMode === mode}
                  onClick={() => setRenderMode(mode)}
                  style={renderMode === mode ? activeSegmentButtonStyle : segmentButtonStyle}
                >
                  {mode}
                </button>
              ))}
            </div>
            <label style={compactFieldLabelStyle}>
              Zoom
              <input
                type="range"
                min={40}
                max={120}
                value={zoomLevel}
                onChange={(event) => setZoomLevel(Number(event.currentTarget.value))}
                style={rangeInputStyle}
              />
            </label>
            <label style={compactFieldLabelStyle}>
              Lighting
              <input
                type="range"
                min={20}
                max={100}
                value={lightingLevel}
                onChange={(event) => setLightingLevel(Number(event.currentTarget.value))}
                style={rangeInputStyle}
              />
            </label>
          </section>
        </div>

        <div style={viewerGridStyle}>
          <div style={previewFrameStyle} aria-label="Generated asset preview">
            <div style={previewTopBarStyle}>
              <span>{viewMode} view | {orbitView}</span>
              <span>{renderMode} | zoom {zoomLevel}% | light {lightingLevel}%</span>
            </div>
            <div style={previewCanvasStyle}>
              <div style={previewGridStyle} />
              <div style={{ ...assetPedestalStyle, transform: `translateX(-50%) scale(${zoomLevel / 72})` }} />
              <div style={{ ...assetBackRestStyle, filter: `brightness(${lightingLevel + 36}%)` }} />
              <div style={{ ...assetSeatStyle, filter: `brightness(${lightingLevel + 40}%)` }} />
              <div style={{ ...assetLegLeftStyle, filter: `brightness(${lightingLevel + 34}%)` }} />
              <div style={{ ...assetLegRightStyle, filter: `brightness(${lightingLevel + 34}%)` }} />
              <div style={axisGizmoStyle}>XYZ</div>
              <div style={viewerStatusCardStyle}>
                <strong>O3DE evidence candidate</strong>
                <span>Not approved for placement</span>
              </div>
            </div>
          </div>

          <div style={viewerSidePanelStyle} aria-label="Forge viewer evidence">
            <div style={viewerMetricGridStyle}>
              <span><strong>Source row</strong>present</span>
              <span><strong>Products</strong>15</span>
              <span><strong>Dependencies</strong>21</span>
              <span><strong>Warnings</strong>4</span>
            </div>
            <div style={productListStyle}>
              <span style={eyebrowStyle}>Representative products</span>
              <span>triposr_chair_001.glb.azmodel</span>
              <span>triposr_chair_001_glb.procprefab</span>
              <span>triposr_chair_001_lod0.glb.azlod</span>
              <span>triposr_chair_001__14520923307272750946.glb.azmaterial</span>
            </div>
            <div style={reviewGateStyle}>
              <strong>Review gate</strong>
              <span>Show provenance, license status, quality notes, and warnings before assignment design.</span>
            </div>
          </div>
        </div>
      </section>

      <section style={stagePanelStyle} aria-label="Forge Toolbench pipeline">
        <div style={stagePanelHeaderStyle}>
          <div>
            <span style={eyebrowStyle}>Toolbench pipeline</span>
            <p style={mutedParagraphStyle}>
              A single creative prompt fans out into gated steps. This slice is non-mutating and cannot silently skip review.
            </p>
          </div>
          <span style={projectPillStyle}>{activeProjectName}</span>
        </div>
        <ol style={stageListStyle}>
          {forgeStages.map((stage) => (
            <li key={stage.label} style={stageItemStyle}>
              <span style={stageBadgeStyle}>{stage.state}</span>
              <strong>{stage.label}</strong>
              <span>{stage.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section style={stagePanelStyle} aria-label="AI Asset Forge O3DE feature coverage">
        <div style={stagePanelHeaderStyle}>
          <div>
            <span style={eyebrowStyle}>O3DE feature coverage</span>
            <p style={mutedParagraphStyle}>
              Forge uses O3DE-native evidence paths, typed adapters, and our own app control surface.
            </p>
          </div>
          <span style={projectPillStyle}>No silent scene mutation</span>
        </div>
        <div style={featureGridStyle}>
          {o3deFeatureRows.map((feature) => (
            <article key={feature.label} style={featureCardStyle}>
              <span style={featureStateStyle}>{feature.state}</span>
              <strong>{feature.label}</strong>
              <span>{feature.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <div style={evidenceGridStyle}>
        <section style={evidencePanelStyle} aria-label="Current Forge proof status">
          <span style={eyebrowStyle}>Current proof evidence</span>
          <strong>triposr_chair_001</strong>
          <p style={mutedParagraphStyle}>
            The sandbox GLB evidence remains read-only here: source row, product rows, dependency rows,
            catalog presence, and warnings captured for review.
          </p>
        </section>
        <section style={evidencePanelStyle} aria-label="Forge blocked boundaries">
          <span style={eyebrowStyle}>Still blocked</span>
          <strong>Generation, import, staging, assignment, and placement</strong>
          <p style={mutedParagraphStyle}>
            Create-and-place prompts must remain split into planning, readback evidence, review, approval,
            then later admitted mutation corridors.
          </p>
        </section>
        <section style={evidencePanelStyle} aria-label="Forge review next step">
          <span style={eyebrowStyle}>Next professional gate</span>
          <strong>Structured review packet</strong>
          <p style={mutedParagraphStyle}>
            Show provenance, hashes, product mapping, dependency counts, catalog presence, warnings,
            license status, and operator decision state.
          </p>
          {onOpenRuntimeOverview ? (
            <button type="button" onClick={onOpenRuntimeOverview} style={secondaryButtonStyle}>
              Check Runtime evidence
            </button>
          ) : null}
        </section>
      </div>
    </section>
  );
}

const forgeShellStyle = {
  display: "grid",
  gap: 14,
  padding: 14,
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--app-panel-bg-alt) 88%, var(--app-info-bg) 12%) 0%, var(--app-panel-bg) 100%)",
} satisfies CSSProperties;

const forgeHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const titleStyle = {
  display: "block",
  fontSize: 19,
  lineHeight: 1.2,
} satisfies CSSProperties;

const reviewPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "6px 10px",
  border: "1px solid var(--app-warning-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-warning-bg)",
  color: "var(--app-warning-text)",
  fontSize: 12,
  fontWeight: 800,
} satisfies CSSProperties;

const forgeGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 1fr) minmax(300px, 1fr)",
  gap: 12,
  alignItems: "start",
} satisfies CSSProperties;

const promptPanelStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const requestPanelStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const editGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 9,
} satisfies CSSProperties;

const compactFieldLabelStyle = {
  display: "grid",
  gap: 6,
  minWidth: 0,
  color: "var(--app-subtle-color)",
  fontSize: 12,
  fontWeight: 800,
} satisfies CSSProperties;

const wideFieldLabelStyle = {
  ...compactFieldLabelStyle,
  gridColumn: "1 / -1",
} satisfies CSSProperties;

const compactInputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  font: "inherit",
} satisfies CSSProperties;

const viewerShellStyle = {
  display: "grid",
  gap: 12,
  padding: 12,
  border: "1px solid color-mix(in srgb, var(--app-accent-strong) 44%, var(--app-panel-border) 56%)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--app-panel-bg-muted) 84%, var(--app-info-bg) 16%) 0%, var(--app-panel-bg) 100%)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const viewerHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const viewerGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1.35fr) minmax(260px, 0.85fr)",
  gap: 12,
  alignItems: "stretch",
} satisfies CSSProperties;

const toolSuiteStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 0.9fr) minmax(320px, 1.1fr)",
  gap: 10,
} satisfies CSSProperties;

const toolSuitePanelStyle = {
  display: "grid",
  alignContent: "start",
  gap: 9,
  minWidth: 0,
  padding: 11,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "color-mix(in srgb, var(--app-panel-bg) 88%, var(--app-info-bg) 12%)",
} satisfies CSSProperties;

const segmentedGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(78px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const segmentButtonStyle = {
  minHeight: 34,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "6px 8px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "capitalize",
} satisfies CSSProperties;

const activeSegmentButtonStyle = {
  ...segmentButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const controlActionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 7,
} satisfies CSSProperties;

const disabledButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
  cursor: "not-allowed",
  fontWeight: 800,
  opacity: 0.68,
} satisfies CSSProperties;

const rangeInputStyle = {
  width: "100%",
  minWidth: 0,
  accentColor: "var(--app-accent)",
} satisfies CSSProperties;

const previewFrameStyle = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  minHeight: 330,
  border: "1px solid rgba(124, 175, 255, 0.34)",
  borderRadius: "var(--app-card-radius)",
  overflow: "hidden",
  background: "#071225",
} satisfies CSSProperties;

const previewTopBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 10px",
  background: "rgba(4, 13, 28, 0.92)",
  color: "#dbe8ff",
  fontSize: 12,
} satisfies CSSProperties;

const previewCanvasStyle = {
  position: "relative",
  minHeight: 300,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, #17345f 0%, #081426 58%, #050d18 100%)",
} satisfies CSSProperties;

const previewGridStyle = {
  position: "absolute",
  inset: "54% -18% -30%",
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  transform: "perspective(470px) rotateX(62deg)",
  transformOrigin: "top",
} satisfies CSSProperties;

const assetPedestalStyle = {
  position: "absolute",
  left: "50%",
  bottom: 46,
  width: 180,
  height: 22,
  borderRadius: "50%",
  transform: "translateX(-50%)",
  background: "rgba(124, 175, 255, 0.2)",
  border: "1px solid rgba(180, 213, 255, 0.38)",
} satisfies CSSProperties;

const assetBackRestStyle = {
  position: "absolute",
  left: "50%",
  bottom: 112,
  width: 118,
  height: 118,
  border: "1px solid rgba(236, 225, 203, 0.82)",
  borderRadius: "8px 8px 5px 5px",
  transform: "translateX(-50%) skewX(-5deg)",
  background:
    "linear-gradient(135deg, rgba(116, 77, 44, 0.95) 0%, rgba(156, 112, 70, 0.96) 52%, rgba(80, 54, 34, 0.96) 100%)",
  boxShadow: "0 18px 34px rgba(0, 0, 0, 0.34)",
} satisfies CSSProperties;

const assetSeatStyle = {
  position: "absolute",
  left: "50%",
  bottom: 84,
  width: 150,
  height: 46,
  border: "1px solid rgba(210, 235, 190, 0.8)",
  borderRadius: "8px",
  transform: "translateX(-50%) skewX(-10deg)",
  background:
    "linear-gradient(135deg, rgba(57, 109, 68, 0.96) 0%, rgba(99, 150, 88, 0.96) 58%, rgba(40, 74, 48, 0.96) 100%)",
} satisfies CSSProperties;

const assetLegLeftStyle = {
  position: "absolute",
  left: "calc(50% - 58px)",
  bottom: 52,
  width: 20,
  height: 62,
  borderRadius: "5px",
  background: "rgba(111, 75, 44, 0.96)",
  transform: "skewX(8deg)",
} satisfies CSSProperties;

const assetLegRightStyle = {
  ...assetLegLeftStyle,
  left: "calc(50% + 38px)",
  transform: "skewX(-8deg)",
} satisfies CSSProperties;

const axisGizmoStyle = {
  position: "absolute",
  top: 14,
  right: 14,
  padding: "7px 9px",
  border: "1px solid rgba(255, 255, 255, 0.22)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(0, 0, 0, 0.32)",
  color: "#dbe8ff",
  fontSize: 12,
  fontWeight: 900,
} satisfies CSSProperties;

const viewerStatusCardStyle = {
  position: "absolute",
  left: 16,
  bottom: 16,
  display: "grid",
  gap: 4,
  maxWidth: 260,
  padding: 11,
  border: "1px solid rgba(124, 175, 255, 0.35)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(2, 8, 18, 0.76)",
  color: "#e8f1ff",
  lineHeight: 1.35,
} satisfies CSSProperties;

const viewerSidePanelStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const viewerMetricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const productListStyle = {
  display: "grid",
  gap: 7,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-muted-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const reviewGateStyle = {
  display: "grid",
  gap: 6,
  padding: 12,
  border: "1px solid var(--app-warning-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-warning-bg)",
  color: "var(--app-warning-text)",
  lineHeight: 1.4,
} satisfies CSSProperties;

const fieldLabelStyle = {
  display: "grid",
  gap: 7,
  color: "var(--app-muted-color)",
  fontSize: 13,
  fontWeight: 800,
} satisfies CSSProperties;

const promptTextAreaStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  resize: "vertical",
  minHeight: 122,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  font: "inherit",
  lineHeight: 1.45,
} satisfies CSSProperties;

const promptComparisonStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 8,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const requestGridStyle = {
  display: "grid",
  gap: 6,
  margin: 0,
} satisfies CSSProperties;

const requestRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(150px, 0.65fr) minmax(0, 1fr)",
  gap: 10,
  padding: "7px 0",
  borderBottom: "1px solid color-mix(in srgb, var(--app-panel-border) 70%, transparent)",
  color: "var(--app-muted-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const stagePanelStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const stagePanelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const projectPillStyle = {
  ...reviewPillStyle,
  border: "1px solid var(--app-info-border)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const stageListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
  margin: 0,
  padding: 0,
  listStyle: "none",
} satisfies CSSProperties;

const stageItemStyle = {
  display: "grid",
  gap: 5,
  alignContent: "start",
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-muted-color)",
  lineHeight: 1.35,
} satisfies CSSProperties;

const featureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const featureCardStyle = {
  display: "grid",
  gap: 6,
  alignContent: "start",
  minHeight: 116,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-muted-color)",
  lineHeight: 1.35,
} satisfies CSSProperties;

const featureStateStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "3px 7px",
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  fontSize: 11,
  fontWeight: 800,
} satisfies CSSProperties;

const stageBadgeStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "3px 7px",
  border: "1px solid var(--app-success-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
  fontSize: 11,
  fontWeight: 800,
} satisfies CSSProperties;

const evidenceGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 10,
} satisfies CSSProperties;

const evidencePanelStyle = {
  display: "grid",
  gap: 8,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const buttonRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  cursor: "pointer",
  fontWeight: 800,
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 700,
} satisfies CSSProperties;

const eyebrowStyle = {
  display: "block",
  marginBottom: 4,
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
} satisfies CSSProperties;

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;
