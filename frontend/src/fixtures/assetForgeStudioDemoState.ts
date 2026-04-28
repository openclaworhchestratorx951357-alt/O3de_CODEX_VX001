import type { AssetForgeStudioDemoState } from "../types/assetForgeStudioDemo";

export const assetForgeStudioDemoState: AssetForgeStudioDemoState = {
  title: "Asset Forge Studio",
  subtitle: "Generate, prepare, and stage O3DE-ready 3D assets.",
  lanes: [
    {
      lane: "Provider",
      truth: "blocked",
      detail: "Provider execution is blocked until policy, provenance, and cost gates are admitted.",
    },
    {
      lane: "Blender",
      truth: "preflight-only",
      detail: "Blender lane is preflight-only. Detection/readiness only in this packet.",
    },
    {
      lane: "O3DE ingest",
      truth: "plan-only",
      detail: "Ingest is plan-only. No project writes are admitted in Packet 01.",
    },
    {
      lane: "Placement",
      truth: "plan-only",
      detail: "Placement remains plan-only pending exact admitted Editor paths.",
    },
    {
      lane: "Review",
      truth: "demo",
      detail: "Review timeline is demo state sourced from typed fixture data.",
    },
  ],
  generationWorkspace: {
    prompt: "Stylized weathered stone arch with ivy and modular snap points for a fantasy village bridge kit.",
    references: [
      "Reference image A: mossy medieval bridge silhouette",
      "Reference image B: O3DE level scale target (human proxy)",
      "Reference style: hand-painted + PBR hybrid finish",
    ],
    stylePreset: "Hero prop / modular environment piece",
    polyBudget: "18k-25k tris (placeholder target)",
    materialPlan: "2 material slots, 4K albedo/normal/roughness placeholder map set",
    actions: [
      {
        id: "plan-preview",
        label: "Plan preview candidates",
        truth: "demo",
        blockedReason: "Demo planner only. No external generation call is executed.",
      },
      {
        id: "refine-selected",
        label: "Refine selected candidate",
        truth: "blocked",
        blockedReason: "Provider refine endpoint is blocked pending policy and provenance gates.",
      },
      {
        id: "texture-selected",
        label: "Texture selected candidate",
        truth: "blocked",
        blockedReason: "Texture generation is blocked in Packet 01.",
      },
      {
        id: "send-blender",
        label: "Send to Blender prep",
        truth: "preflight-only",
        blockedReason: "Preflight-only lane. No Blender execution is admitted.",
      },
      {
        id: "stage-o3de",
        label: "Stage for O3DE",
        truth: "plan-only",
        blockedReason: "Stage planning only. O3DE writes are blocked.",
      },
    ],
  },
  candidates: [
    {
      id: "candidate-a",
      name: "Weathered Ivy Arch",
      status: "demo",
      previewNotes: "Balanced silhouette and moderate texture complexity.",
      readinessPlaceholder: "O3DE readiness placeholder: 74/100 (demo)",
      trisEstimate: "~21k tris (demo estimate)",
    },
    {
      id: "candidate-b",
      name: "Broken Keystone Span",
      status: "demo",
      previewNotes: "Damaged keystone with hero storytelling profile.",
      readinessPlaceholder: "O3DE readiness placeholder: 67/100 (demo)",
      trisEstimate: "~24k tris (demo estimate)",
    },
    {
      id: "candidate-c",
      name: "Modular Low-Poly Span",
      status: "demo",
      previewNotes: "Lower poly profile optimized for crowd scenes.",
      readinessPlaceholder: "O3DE readiness placeholder: 81/100 (demo)",
      trisEstimate: "~16k tris (demo estimate)",
    },
    {
      id: "candidate-d",
      name: "Cinematic Hero Arch",
      status: "demo",
      previewNotes: "High-detail sculpt style for closeup shots.",
      readinessPlaceholder: "O3DE readiness placeholder: 59/100 (demo)",
      trisEstimate: "~38k tris (demo estimate)",
    },
  ],
  blenderPrep: {
    blenderStatus: "preflight-only",
    executable: "Not detected (demo)",
    version: "Unknown (preflight-only)",
    checks: [
      "Scale normalization checklist (planned)",
      "Origin and transform application checklist (planned)",
      "Normals/mesh cleanup checklist (planned)",
      "Material slot validation checklist (planned)",
    ],
  },
  o3deIngest: {
    ingestStatus: "plan-only",
    stagePlan: [
      "Plan destination source path under project asset tree",
      "Plan manifest/review packet for operator approval",
      "Plan Asset Processor watch/ingest verification",
      "Plan ingest readback evidence capture",
    ],
    reviewWarnings: [
      "No O3DE project mutation in this packet.",
      "No Asset Processor execution in this packet.",
      "No Editor placement execution in this packet.",
    ],
  },
  evidenceTimeline: [
    {
      id: "evt-1",
      timeLabel: "T+00:00",
      title: "Prompt captured as demo input",
      truth: "demo",
      detail: "Prompt was stored in typed local UI state only.",
    },
    {
      id: "evt-2",
      timeLabel: "T+00:02",
      title: "Candidate set prepared",
      truth: "demo",
      detail: "Four demo candidates generated from fixture data.",
    },
    {
      id: "evt-3",
      timeLabel: "T+00:05",
      title: "Blender lane checked",
      truth: "preflight-only",
      detail: "Executable/version shown as preflight-only placeholder.",
    },
    {
      id: "evt-4",
      timeLabel: "T+00:07",
      title: "O3DE ingest plan drafted",
      truth: "plan-only",
      detail: "Ingest and placement remained non-mutating plan surfaces.",
    },
  ],
  settingsStatus: {
    providerConfig: "Not configured (blocked)",
    defaultOutputWorkspace: "asset-forge/runtime (planned path only)",
    allowedFormats: ["glTF", "FBX", "OBJ"],
    safetyGuards: [
      "No provider calls",
      "No Blender execution",
      "No O3DE mutation",
      "No shell/script execution surfaces",
    ],
  },
};
