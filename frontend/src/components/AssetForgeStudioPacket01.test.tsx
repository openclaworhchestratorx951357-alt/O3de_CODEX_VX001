import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssetForgeStudioPacket01 from "./AssetForgeStudioPacket01";
import type {
  AssetForgeBlenderInspectReport,
  AssetForgeO3DEReadbackRecord,
  AssetForgeO3DEReviewPacketRecord,
  AssetForgeO3DEPlacementPlanRecord,
  AssetForgeO3DEPlacementProofRecord,
  AssetForgeBlenderStatusRecord,
  AssetForgeO3DEStagePlanRecord,
  AssetForgeO3DEStageWriteRecord,
  AssetForgePlacementEvidenceAppliedFilters,
  AssetForgePlacementEvidenceIndexRecord,
  AssetForgeProviderStatusRecord,
  ToolPolicy,
} from "../types/contracts";

const apiMocks = vi.hoisted(() => ({
  createAssetForgeO3DEStagePlan: vi.fn(),
  createAssetForgeO3DEPlacementPlan: vi.fn(),
  executeAssetForgeO3DEPlacementProof: vi.fn(),
  readAssetForgeO3DEPlacementEvidence: vi.fn(),
  prepareAssetForgeO3DEPlacementRuntimeHarness: vi.fn(),
  executeAssetForgeO3DEPlacementRuntimeHarness: vi.fn(),
  executeAssetForgeO3DEPlacementLiveProof: vi.fn(),
  getAssetForgeO3DEPlacementLiveProofEvidenceIndex: vi.fn(),
  readAssetForgeO3DEIngestEvidence: vi.fn(),
  createAssetForgeO3DEOperatorReviewPacket: vi.fn(),
  executeAssetForgeO3DEStageWrite: vi.fn(),
  inspectAssetForgeBlenderArtifact: vi.fn(),
  fetchAssetForgeTask: vi.fn(),
  fetchAssetForgeProviderStatus: vi.fn(),
  fetchAssetForgeBlenderStatus: vi.fn(),
  fetchAssetForgeStudioStatus: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  createAssetForgeO3DEStagePlan: apiMocks.createAssetForgeO3DEStagePlan,
  createAssetForgeO3DEPlacementPlan: apiMocks.createAssetForgeO3DEPlacementPlan,
  executeAssetForgeO3DEPlacementProof: apiMocks.executeAssetForgeO3DEPlacementProof,
  readAssetForgeO3DEPlacementEvidence: apiMocks.readAssetForgeO3DEPlacementEvidence,
  prepareAssetForgeO3DEPlacementRuntimeHarness: apiMocks.prepareAssetForgeO3DEPlacementRuntimeHarness,
  executeAssetForgeO3DEPlacementRuntimeHarness: apiMocks.executeAssetForgeO3DEPlacementRuntimeHarness,
  executeAssetForgeO3DEPlacementLiveProof: apiMocks.executeAssetForgeO3DEPlacementLiveProof,
  getAssetForgeO3DEPlacementLiveProofEvidenceIndex: apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex,
  readAssetForgeO3DEIngestEvidence: apiMocks.readAssetForgeO3DEIngestEvidence,
  createAssetForgeO3DEOperatorReviewPacket: apiMocks.createAssetForgeO3DEOperatorReviewPacket,
  executeAssetForgeO3DEStageWrite: apiMocks.executeAssetForgeO3DEStageWrite,
  inspectAssetForgeBlenderArtifact: apiMocks.inspectAssetForgeBlenderArtifact,
  fetchAssetForgeTask: apiMocks.fetchAssetForgeTask,
  fetchAssetForgeProviderStatus: apiMocks.fetchAssetForgeProviderStatus,
  fetchAssetForgeBlenderStatus: apiMocks.fetchAssetForgeBlenderStatus,
  fetchAssetForgeStudioStatus: apiMocks.fetchAssetForgeStudioStatus,
}));

function makePolicy(overrides: Partial<ToolPolicy> = {}): ToolPolicy {
  return {
    agent: "planner",
    tool: "asset.source.inspect",
    approval_class: "read_only",
    adapter_family: "asset",
    capability_status: "prompt-ready-read-only",
    real_admission_stage: "real-read-only-active",
    next_real_requirement: "Keep lane narrow.",
    args_schema: "schemas/tools/asset.source.inspect.args.schema.json",
    result_schema: "schemas/tools/asset.source.inspect.result.schema.json",
    required_locks: [],
    risk: "low",
    requires_approval: false,
    supports_dry_run: true,
    execution_mode: "real",
    ...overrides,
  };
}

function makeProviderStatus(
  overrides: Partial<AssetForgeProviderStatusRecord> = {},
): AssetForgeProviderStatusRecord {
  return {
    capability_name: "asset_forge.provider.status",
    maturity: "preflight-only",
    provider_mode: "mock",
    configuration_ready: true,
    credential_status: "redacted-env-present",
    external_task_creation_allowed: false,
    generation_execution_status: "blocked",
    providers: [
      {
        provider_id: "asset_forge_provider_primary",
        display_name: "Asset Forge Provider Registry Entry",
        mode: "mock",
        configured: true,
        note: "Mock provider mode enabled for UI preflight only.",
      },
    ],
    warnings: ["No external provider task creation is admitted in Packet 04."],
    safest_next_step: "Keep provider status preflight-only.",
    source: "asset-forge-provider-registry",
    ...overrides,
  };
}

function makeBlenderStatus(
  overrides: Partial<AssetForgeBlenderStatusRecord> = {},
): AssetForgeBlenderStatusRecord {
  return {
    capability_name: "asset_forge.blender.status",
    maturity: "preflight-only",
    executable_found: true,
    executable_path: "C:\\Blender\\blender.exe",
    detection_source: "env:ASSET_FORGE_BLENDER_PATH",
    version: "Blender 4.1.1",
    version_probe_status: "detected",
    blender_prep_execution_status: "blocked",
    warnings: ["Blender detection is preflight-only in Packet 05."],
    safest_next_step: "Use this preflight evidence to scope a bounded read-only packet.",
    source: "asset-forge-blender-preflight",
    ...overrides,
  };
}

function makeInspectReport(
  overrides: Partial<AssetForgeBlenderInspectReport> = {},
): AssetForgeBlenderInspectReport {
  return {
    capability_name: "asset_forge.blender.inspect",
    maturity: "preflight-only",
    inspection_status: "succeeded",
    artifact_path: "C:\\runtime\\asset_forge\\candidates\\sample.obj",
    runtime_root: "C:\\runtime\\asset_forge",
    artifact_within_runtime_root: true,
    extension_allowed: true,
    script_id: "asset_forge_blender_readonly_inspector_v1",
    script_path: "C:\\repo\\backend\\scripts\\asset_forge_blender_inspect.py",
    script_execution_status: "executed",
    blender_execution_status: "blocked",
    metadata: {
      extension: ".obj",
      artifact_file_size_bytes: 128,
      inspection_policy: {
        allowed_extensions: [".obj", ".fbx", ".glb", ".gltf", ".blend"],
        max_inspect_bytes: 262144000,
        read_only: true,
      },
      parse_summary: { format: "obj", vertices: 3, faces: 1 },
      read_only: true,
    },
    warnings: ["Blender executable invocation remains blocked in this packet."],
    safest_next_step: "Use this read-only inspection evidence to plan bounded prep actions.",
    source: "asset-forge-blender-inspect",
    ...overrides,
  };
}

function makeStagePlanReport(overrides: Partial<AssetForgeO3DEStagePlanRecord> = {}) {
  return {
    capability_name: "asset_forge.o3de.stage.plan",
    maturity: "plan-only",
    plan_status: "ready-for-approval",
    candidate_id: "candidate-a",
    candidate_label: "Weathered Ivy Arch",
    project_root_hint: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
    deterministic_staging_relative_path: "Assets/Generated/asset_forge/candidate_a_weathered_ivy_arch/candidate_a_weathered_ivy_arch.glb",
    deterministic_manifest_relative_path: "Assets/Generated/asset_forge/candidate_a_weathered_ivy_arch/candidate_a_weathered_ivy_arch.forge.json",
    expected_source_asset_path: "Assets/Generated/asset_forge/candidate_a_weathered_ivy_arch/candidate_a_weathered_ivy_arch.glb",
    stage_plan_policy: {
      allowed_output_extensions: [".glb", ".gltf", ".fbx", ".obj"],
      allowed_staging_prefix: "Assets/Generated/asset_forge/",
      approval_required_for_write: true,
      project_write_admitted: false,
    },
    approval_required: true,
    project_write_admitted: false,
    warnings: ["This is a deterministic plan-only stage output; no project write is performed."],
    safest_next_step: "Review deterministic stage path before write admission.",
    source: "asset-forge-o3de-stage-plan",
    ...overrides,
  } satisfies AssetForgeO3DEStagePlanRecord;
}

function makeStageWriteReport(
  overrides: Partial<AssetForgeO3DEStageWriteRecord> = {},
): AssetForgeO3DEStageWriteRecord {
  return {
    capability_name: "asset_forge.o3de.stage.write",
    maturity: "approval-gated-write",
    write_status: "succeeded",
    candidate_id: "candidate-a",
    candidate_label: "Weathered Ivy Arch",
    project_root: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
    source_artifact_path: "C:\\runtime\\asset_forge\\prepared_exports\\candidate_a.glb",
    destination_source_asset_path: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\Assets\\Generated\\asset_forge\\candidate_a\\candidate_a.glb",
    destination_manifest_path: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\Assets\\Generated\\asset_forge\\candidate_a\\candidate_a.forge.json",
    approval_required: true,
    approval_state: "approved",
    write_executed: true,
    project_write_admitted: true,
    bytes_copied: 1024,
    source_sha256: "source-hash",
    destination_sha256: "source-hash",
    manifest_sha256: "manifest-hash",
    post_write_readback: {
      source_exists: true,
      destination_exists: true,
      manifest_exists: true,
    },
    revert_paths: [
      "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\Assets\\Generated\\asset_forge\\candidate_a\\candidate_a.glb",
      "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\Assets\\Generated\\asset_forge\\candidate_a\\candidate_a.forge.json",
    ],
    warnings: ["Stage write corridor is approval-gated and path-bounded."],
    safest_next_step: "Run read-only verification next.",
    source: "asset-forge-o3de-stage-write",
    ...overrides,
  };
}

function makeReadbackReport(
  overrides: Partial<AssetForgeO3DEReadbackRecord> = {},
): AssetForgeO3DEReadbackRecord {
  return {
    capability_name: "asset_forge.o3de.ingest.readback",
    maturity: "preflight-only",
    readback_status: "succeeded",
    candidate_id: "candidate-a",
    candidate_label: "Weathered Ivy Arch",
    project_root: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
    source_asset_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
    source_asset_absolute_path: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\Assets\\Generated\\asset_forge\\candidate_a\\candidate_a.glb",
    selected_platform: "pc",
    source_exists: true,
    source_size_bytes: 1024,
    source_sha256: "source-hash",
    asset_database_path: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\Cache\\assetdb.sqlite",
    asset_database_exists: true,
    asset_database_freshness_status: "fresh",
    asset_database_last_write_time: "2026-04-28T00:00:00+00:00",
    source_found_in_assetdb: true,
    source_id: 3216,
    source_guid: "A7FF11AC580354B6A918A8AF225DAA3A",
    asset_processor_job_rows: [
      "job_id=4401, job_key=Scene compilation, platform=pc, status=4, warnings=4, errors=0",
    ],
    asset_processor_warning_count: 4,
    asset_processor_error_count: 0,
    product_count: 1,
    dependency_count: 1,
    representative_products: [
      "pc/assets/generated/asset_forge/candidate_a/candidate_a.azmodel",
    ],
    representative_dependencies: [
      "product_id=9001, platform=pc, dependency_guid=0102030405060708090A0B0C0D0E0F10, dependency_sub_id=12, flags=3, unresolved_path=materials/candidate_a.material",
    ],
    catalog_path: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\Cache\\pc\\assetcatalog.xml",
    catalog_exists: true,
    catalog_freshness_status: "fresh",
    catalog_last_write_time: "2026-04-28T00:00:00+00:00",
    catalog_presence: true,
    catalog_product_path_presence: [
      "pc/assets/generated/asset_forge/candidate_a/candidate_a.azmodel -> present=True, match_count=1",
    ],
    read_only: true,
    mutation_occurred: false,
    warnings: [
      "Packet 09 readback is read-only evidence capture only.",
    ],
    safest_next_step: "Review evidence and continue with placement planning gate.",
    source: "asset-forge-o3de-ingest-readback",
    ...overrides,
  };
}

function makeReviewPacketReport(
  overrides: Partial<AssetForgeO3DEReviewPacketRecord> = {},
): AssetForgeO3DEReviewPacketRecord {
  return {
    capability_name: "asset_forge.o3de.operator_review_packet",
    maturity: "proof-only",
    review_packet_version: "asset-forge-o3de-review-packet/v1",
    candidate_id: "candidate-a",
    candidate_label: "Weathered Ivy Arch",
    asset_slug: "candidate_a_weathered_ivy_arch",
    project_root: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
    project_name: "McpSandbox",
    selected_platform: "pc",
    source_asset_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
    provenance_metadata_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.forge.json",
    source_asset_sha256: "source-hash",
    read_only: true,
    mutation_occurred: false,
    review_status: "ready_for_operator_decision",
    blocked_reason: null,
    operator_decision: "pending",
    next_safest_step: "Record an operator decision while keeping assignment/placement execution blocked.",
    provenance: {
      license_name: "CC-BY-4.0",
      commercial_use_allowed: true,
    },
    o3de_source: {
      project_root: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
    },
    asset_processor: {
      asset_processor_completed: true,
      asset_processor_warnings: 0,
    },
    phase9_readback: {
      product_count: 1,
      dependency_count: 1,
    },
    quality_review: {
      mesh_quality_review: "pass",
    },
    warnings: ["Packet remains read-only and non-authorizing."],
    source: "asset-forge-o3de-operator-review-packet",
    ...overrides,
  };
}

function makePlacementPlanReport(
  overrides: Partial<AssetForgeO3DEPlacementPlanRecord> = {},
): AssetForgeO3DEPlacementPlanRecord {
  return {
    capability_name: "asset_forge.o3de.placement.plan",
    maturity: "plan-only",
    plan_status: "ready-for-approval",
    candidate_id: "candidate-a",
    candidate_label: "Weathered Ivy Arch",
    staged_source_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
    target_level_relative_path: "Levels/BridgeLevel01/BridgeLevel01.prefab",
    target_entity_name: "AssetForgeCandidateA",
    target_component: "Mesh",
    placement_execution_status: "blocked",
    approval_required: true,
    placement_write_admitted: false,
    placement_plan_policy: {
      allowed_stage_prefix: "Assets/Generated/asset_forge/",
      allowed_stage_extensions: [".fbx", ".glb", ".gltf", ".obj"],
      allowed_level_prefix: "Levels/",
      allowed_level_suffix: ".prefab",
      approval_required_for_proof: true,
      placement_write_admitted: false,
    },
    placement_plan_summary: "Plan-only placement target prepared.",
    requirement_checklist: ["Target level path is defined and project-relative."],
    warnings: ["Packet 10 is plan-only. No Editor placement execution is performed."],
    safest_next_step: "Keep plan-only before future proof/admission.",
    source: "asset-forge-o3de-placement-plan",
    ...overrides,
  };
}

function makePlacementProofReport(
  overrides: Partial<AssetForgeO3DEPlacementProofRecord> = {},
): AssetForgeO3DEPlacementProofRecord {
  return {
    capability_name: "asset_forge.o3de.placement.execute",
    maturity: "proof-only",
    proof_status: "blocked",
    candidate_id: "candidate-a",
    candidate_label: "Weathered Ivy Arch",
    staged_source_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
    target_level_relative_path: "Levels/BridgeLevel01/BridgeLevel01.prefab",
    target_entity_name: "AssetForgeCandidateA",
    target_component: "Mesh",
    approval_required: true,
    approval_state: "approved",
    placement_proof_policy: {
      approval_required: true,
      approval_note_required_when_approved: true,
      runtime_gate_env: "ASSET_FORGE_ENABLE_PLACEMENT_PROOF",
      runtime_gate_required: true,
      placement_execution_admitted: false,
      mutation_scope: "proof-only-no-scene-mutation",
    },
    placement_execution_status: "blocked",
    proof_runtime_gate_enabled: false,
    write_occurred: false,
    warnings: ["Runtime proof gate is disabled."],
    safest_next_step: "Enable runtime gate in controlled proof environment.",
    source: "asset-forge-o3de-placement-proof",
    ...overrides,
  };
}

function makeEvidenceIndexReport(
  overrides: Partial<AssetForgePlacementEvidenceIndexRecord> = {},
): AssetForgePlacementEvidenceIndexRecord {
  const appliedFilters: AssetForgePlacementEvidenceAppliedFilters = {
    limit: 10,
    proof_status: "succeeded",
    candidate_id: "candidate-a",
    from_age_s: 300,
  };
  return {
    capability_name: "asset_forge.o3de.placement.live_proof.evidence_index",
    maturity: "preflight-only",
    index_status: "succeeded",
    runtime_root: "C:\\runtime\\asset_forge",
    evidence_dir: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence",
    applied_filters: appliedFilters,
    freshness_window_seconds: 1800,
    fresh_item_count: 1,
    items: [
      {
        path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-a.json",
        recorded_at: "2026-04-28T00:00:00+00:00",
        candidate_id: "candidate-a",
        bridge_command_id: "bridge-001",
        proof_status: "succeeded",
        age_seconds: 42,
      },
    ],
    read_only: true,
    warnings: ["Evidence index is read-only."],
    source: "asset-forge-placement-live-proof-evidence-index",
    ...overrides,
  };
}

describe("AssetForgeStudioPacket01", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.sessionStorage.clear();
    apiMocks.fetchAssetForgeTask.mockRejectedValue(new Error("no task model in test"));
    apiMocks.fetchAssetForgeProviderStatus.mockRejectedValue(new Error("no provider status in test"));
    apiMocks.fetchAssetForgeBlenderStatus.mockRejectedValue(new Error("no blender status in test"));
    apiMocks.fetchAssetForgeStudioStatus.mockRejectedValue(new Error("no studio status in test"));
  });

  it("renders conservative Packet 01 capability-delta labels in the settings panel", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByText("Packet 01 capability delta")).toBeInTheDocument();
    expect(
      screen.getByText("Asset Forge GUI: M1 concept/docs -> M3 plan-only/demo studio shell."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Blender Prep GUI: M1 concept/docs -> M3 visible planned/preflight surface."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("O3DE Ingest GUI: M1 concept/docs -> M3 plan-only review surface."),
    ).toBeInTheDocument();
  });

  it("shows demo fallback status-source label when backend status signals are absent", () => {
    render(<AssetForgeStudioPacket01 />);
    expect(screen.getByText("Status source: demo fallback only.")).toBeInTheDocument();
  });

  it("shows backend status-source label when backend status signals are present", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    expect(screen.getByText("Status source: backend status signals.")).toBeInTheDocument();
  });

  it("renders provider registry preflight cards with blocked execution truth", () => {
    render(<AssetForgeStudioPacket01 providerStatus={makeProviderStatus()} />);
    expect(screen.getByText("Provider registry (preflight-only)")).toBeInTheDocument();
    expect(screen.getByText("Mode: mock")).toBeInTheDocument();
    expect(screen.getByText("Configured: yes")).toBeInTheDocument();
    expect(screen.getByText("Execution: blocked (blocked)")).toBeInTheDocument();
  });

  it("renders blender preflight probe details when version probe fails", () => {
    render(
      <AssetForgeStudioPacket01
        blenderStatus={makeBlenderStatus({
          version: null,
          version_probe_status: "failed",
          detection_source: "env:ASSET_FORGE_BLENDER_PATH",
        })}
      />,
    );
    expect(screen.getByText("Version probe: failed")).toBeInTheDocument();
    expect(screen.getByText("Detection source: env:ASSET_FORGE_BLENDER_PATH")).toBeInTheDocument();
    expect(screen.getByText("Version status: Unknown (failed)")).toBeInTheDocument();
  });

  it("renders the Blender-style editor workspace with viewport controls and mode chips", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByText("Blender-style Asset Forge Editor Workspace")).toBeInTheDocument();
    expect(screen.getByText("Editor workspace mode")).toBeInTheDocument();
    expect(
      screen.getByText("Demo / plan-only surface - no admitted-real 3D editing, Blender execution, or O3DE mutation."),
    ).toBeInTheDocument();
    expect(screen.getByText("3D viewport")).toBeInTheDocument();
    expect(screen.getByText("Demo viewport - no real model loaded")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Orbit (O)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pan (P)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom (Z)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Frame (F)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Top (T)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Front (R)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Side (Y)" })).toBeInTheDocument();
    for (const mode of ["Solid", "Material Preview", "Wireframe", "O3DE Preview"]) {
      expect(screen.getByText(mode)).toBeInTheDocument();
    }
  });

  it("updates active demo editor selections when tool, mode, and view controls are clicked", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: /Move/i }));
    fireEvent.click(screen.getByRole("button", { name: /Wireframe/i }));
    fireEvent.click(screen.getByRole("button", { name: /Top/i }));

    expect(screen.getByText("Active tool: Move (demo only)")).toBeInTheDocument();
    expect(screen.getByText("Active viewport mode: Wireframe (demo). Active view control: Top (demo).")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Move/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Wireframe/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Top/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows demo keyboard shortcut hints for tool rail and viewport controls", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByText("Shortcut hint (demo): `1-9` tool slots only, no real editing execution.")).toBeInTheDocument();
    expect(screen.getByText("Shortcut hint (demo): `S/M/W/Q` modes and `O/P/Z/F/T/R/Y` view controls.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select \(1\)/i })).toHaveAttribute("aria-keyshortcuts", "1");
    expect(screen.getByRole("button", { name: /Orbit \(O\)/i })).toHaveAttribute("aria-keyshortcuts", "O");
    expect(screen.getByRole("button", { name: "Solid" })).toHaveAttribute("aria-keyshortcuts", "S");
  });

  it("filters object outliner items with live demo match counts", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    const outlinerSection = screen.getByText("Object outliner").closest("section");
    expect(outlinerSection).not.toBeNull();
    const outliner = within(outlinerSection as HTMLElement);

    expect(outliner.getByText("Outliner matches: 7/7 (demo only)")).toBeInTheDocument();
    fireEvent.change(outliner.getByPlaceholderText("Filter objects (demo)"), { target: { value: "texture" } });
    expect(outliner.getByText("Outliner matches: 1/7 (demo only)")).toBeInTheDocument();
    expect(outliner.getByText("Textures")).toBeInTheDocument();

    fireEvent.change(outliner.getByPlaceholderText("Filter objects (demo)"), { target: { value: "zzz" } });
    expect(outliner.getByText("Outliner matches: 0/7 (demo only)")).toBeInTheDocument();
    expect(outliner.getByText("No outliner items match current filter (demo).")).toBeInTheDocument();
  });

  it("focuses outliner to selected-candidate hint and clears filter in demo mode", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Focus selected in outliner (demo)" }));
    expect(screen.getByText("Outliner matches: 1/7 (demo only)")).toBeInTheDocument();
    expect(screen.getByText("Mesh_LOD0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear outliner filter" }));
    expect(screen.getByText("Outliner matches: 7/7 (demo only)")).toBeInTheDocument();
  });

  it("auto-syncs outliner filter to selected candidate hint when enabled", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    const outlinerSection = screen.getByText("Object outliner").closest("section");
    expect(outlinerSection).not.toBeNull();
    const outliner = within(outlinerSection as HTMLElement);

    fireEvent.click(screen.getByLabelText("Auto-sync outliner to selected candidate hint (demo)"));
    fireEvent.click(screen.getByRole("button", { name: "Select Broken Keystone Span" }));

    expect(outliner.getByText("Selection hint: Materials (demo mapping)")).toBeInTheDocument();
    expect(outliner.getByText("Outliner matches: 1/7 (demo only)")).toBeInTheDocument();
    expect(outliner.getByText("Materials")).toBeInTheDocument();
  });

  it("restores outliner filter and auto-sync toggle from session storage", () => {
    window.sessionStorage.setItem(
      "asset-forge-packet01-outliner-v1",
      JSON.stringify({ filter: "textures", auto_sync: false }),
    );
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByDisplayValue("textures")).toBeInTheDocument();
    expect(screen.getByLabelText("Auto-sync outliner to selected candidate hint (demo)")).not.toBeChecked();
    expect(screen.getByText("Outliner matches: 1/7 (demo only)")).toBeInTheDocument();
  });

  it("restores active demo tool, viewport mode, and control from session storage", () => {
    window.sessionStorage.setItem(
      "asset-forge-packet01-editor-v1",
      JSON.stringify({ tool: "Rotate", viewport_mode: "Wireframe", viewport_control: "Top" }),
    );
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByText("Active tool: Rotate (demo only)")).toBeInTheDocument();
    expect(
      screen.getByText("Active viewport mode: Wireframe (demo). Active view control: Top (demo)."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Rotate \(3\)/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("resets editor workspace demo controls and clears persisted session state", () => {
    window.sessionStorage.setItem(
      "asset-forge-packet01-editor-v1",
      JSON.stringify({ tool: "Rotate", viewport_mode: "Wireframe", viewport_control: "Top" }),
    );
    window.sessionStorage.setItem(
      "asset-forge-packet01-outliner-v1",
      JSON.stringify({ filter: "textures", auto_sync: true }),
    );
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset editor workspace (demo)" }));

    expect(screen.getByText("Active tool: Select (demo only)")).toBeInTheDocument();
    expect(
      screen.getByText("Active viewport mode: Solid (demo). Active view control: Orbit (demo)."),
    ).toBeInTheDocument();
    expect(screen.getByText("Outliner matches: 7/7 (demo only)")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("asset-forge-packet01-editor-v1")).toContain("\"tool\":\"Select\"");
    expect(window.sessionStorage.getItem("asset-forge-packet01-editor-v1")).toContain("\"viewport_mode\":\"Solid\"");
    expect(window.sessionStorage.getItem("asset-forge-packet01-editor-v1")).toContain("\"viewport_control\":\"Orbit\"");
    expect(window.sessionStorage.getItem("asset-forge-packet01-outliner-v1")).toContain("\"filter\":\"\"");
    expect(window.sessionStorage.getItem("asset-forge-packet01-outliner-v1")).toContain("\"auto_sync\":false");
  });

  it("renders a live editor state snapshot readout in demo mode", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: /^Move \(2\)/i }));
    fireEvent.click(screen.getByRole("button", { name: "Material Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Frame (F)" }));
    fireEvent.change(screen.getByPlaceholderText("Filter objects (demo)"), { target: { value: "materials" } });
    fireEvent.click(screen.getByLabelText("Auto-sync outliner to selected candidate hint (demo)"));

    expect(screen.getByText("Editor state snapshot (demo)")).toBeInTheDocument();
    expect(screen.getByText("Tool: Move")).toBeInTheDocument();
    expect(screen.getByText("Viewport mode: Material Preview")).toBeInTheDocument();
    expect(screen.getByText("View control: Frame")).toBeInTheDocument();
    expect(screen.getByText("Outliner filter: Mesh_LOD0")).toBeInTheDocument();
    expect(screen.getByText("Outliner auto-sync: on")).toBeInTheDocument();
  });

  it("copies editor snapshot text in demo mode", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy editor snapshot (demo)" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Editor snapshot copied.")).toBeInTheDocument();
    });
  });

  it("schedules editor snapshot copy status auto-clear timeout", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy editor snapshot (demo)" }));

    await waitFor(() => {
      expect(screen.getByText("Editor snapshot copied.")).toBeInTheDocument();
    });

    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3200);
    setTimeoutSpy.mockRestore();
  });

  it("schedules auto-clear timeout for snapshot copy clipboard-unavailable status", async () => {
    const originalClipboard = navigator.clipboard;
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy editor snapshot (demo)" }));

    await waitFor(() => {
      expect(screen.getByText("Clipboard unavailable in this environment.")).toBeInTheDocument();
    });
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3200);

    setTimeoutSpy.mockRestore();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("renders tool rail, outliner hierarchy, and inspector sections", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByText("Tool rail")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Select \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Inspect Mesh \(9\)/i })).toBeInTheDocument();

    expect(screen.getByText("Object outliner")).toBeInTheDocument();
    expect(screen.getByText("Asset Root")).toBeInTheDocument();
    expect(screen.getByText("Mesh_LOD1 planned")).toBeInTheDocument();

    expect(screen.getByText("Inspector")).toBeInTheDocument();
    expect(screen.getByText("Transform")).toBeInTheDocument();
    expect(screen.getByText("Geometry")).toBeInTheDocument();
    expect(screen.getAllByText("Materials").length).toBeGreaterThan(0);
    expect(screen.getByText("O3DE Readiness")).toBeInTheDocument();
  });

  it("updates selected candidate state from the viewport candidate tray", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByText("Name: Weathered Ivy Arch")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Select" })[0]);
    expect(screen.getByText("Name: Broken Keystone Span")).toBeInTheDocument();
  });

  it("shows clipboard-unavailable fallback when copying filter query and announces status", async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy filter query" }));

    const fallbackMessage = await screen.findByText("Clipboard unavailable. Query: ?limit=10");
    expect(fallbackMessage).toBeInTheDocument();
    expect(fallbackMessage).toHaveAttribute("role", "status");
    expect(fallbackMessage).toHaveAttribute("aria-live", "polite");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("shows clipboard-copy-failed fallback when filter query copy throws and announces status", async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
      },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy filter query" }));

    const failureMessage = await screen.findByText("Clipboard copy failed. Query: ?limit=10");
    expect(failureMessage).toBeInTheDocument();
    expect(failureMessage).toHaveAttribute("role", "status");
    expect(failureMessage).toHaveAttribute("aria-live", "polite");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("renders filter-query copy success feedback as a live status message", async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy filter query" }));

    const successMessage = await screen.findByText("Copied query to clipboard.");
    expect(successMessage).toBeInTheDocument();
    expect(successMessage).toHaveAttribute("role", "status");
    expect(successMessage).toHaveAttribute("aria-live", "polite");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("auto-clears query copy status feedback after timeout", async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy filter query" }));
    expect(await screen.findByText("Copied query to clipboard.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Copied query to clipboard.")).not.toBeInTheDocument();
    }, { timeout: 4500 });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("auto-clears server-filter copy status feedback after timeout", async () => {
    const originalClipboard = navigator.clipboard;
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const copyServerFiltersButton = screen.getByRole("button", { name: "Copy applied filters (server)" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));
    await waitFor(() => {
      expect(copyServerFiltersButton).toBeEnabled();
    });

    fireEvent.click(copyServerFiltersButton);
    expect(await screen.findByText("Copied server-applied filters to clipboard.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Copied server-applied filters to clipboard.")).not.toBeInTheDocument();
    }, { timeout: 4500 });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("auto-clears pasted-query failure status feedback after timeout", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockRejectedValueOnce(
      new Error("Query parse failed upstream."),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    expect(await screen.findByText("Failed to apply query: Query parse failed upstream.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Failed to apply query: Query parse failed upstream.")).not.toBeInTheDocument();
    }, { timeout: 4500 });
  });

  it("auto-clears pasted-query success status feedback after timeout", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    expect(await screen.findByText("Applied pasted query.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Applied pasted query.")).not.toBeInTheDocument();
    }, { timeout: 4500 });
  });

  it("auto-clears server-filter copy failure status feedback after timeout", async () => {
    const originalClipboard = navigator.clipboard;
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
      },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const copyServerFiltersButton = screen.getByRole("button", { name: "Copy applied filters (server)" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));
    await waitFor(() => {
      expect(copyServerFiltersButton).toBeEnabled();
    });

    fireEvent.click(copyServerFiltersButton);
    expect(await screen.findByText(/Clipboard copy failed\. Server filters:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Clipboard copy failed\. Server filters:/i)).not.toBeInTheDocument();
    }, { timeout: 4500 });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("shows clipboard-unavailable fallback when copying server-applied filters and announces status", async () => {
    const originalClipboard = navigator.clipboard;
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const copyServerFiltersButton = screen.getByRole("button", { name: "Copy applied filters (server)" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));
    await waitFor(() => {
      expect(copyServerFiltersButton).toBeEnabled();
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    fireEvent.click(copyServerFiltersButton);

    const fallbackMessage = await screen.findByText(/Clipboard unavailable\. Server filters:/i);
    expect(fallbackMessage).toBeInTheDocument();
    expect(fallbackMessage).toHaveAttribute("role", "status");
    expect(fallbackMessage).toHaveAttribute("aria-live", "polite");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("shows clipboard-copy-failed fallback when server-applied filters copy throws and announces status", async () => {
    const originalClipboard = navigator.clipboard;
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
      },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const copyServerFiltersButton = screen.getByRole("button", { name: "Copy applied filters (server)" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));
    await waitFor(() => {
      expect(copyServerFiltersButton).toBeEnabled();
    });

    fireEvent.click(copyServerFiltersButton);

    const failureMessage = await screen.findByText(/Clipboard copy failed\. Server filters:/i);
    expect(failureMessage).toBeInTheDocument();
    expect(failureMessage).toHaveAttribute("role", "status");
    expect(failureMessage).toHaveAttribute("aria-live", "polite");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("renders server-applied-filters copy success feedback as a live status message", async () => {
    const originalClipboard = navigator.clipboard;
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const copyServerFiltersButton = screen.getByRole("button", { name: "Copy applied filters (server)" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));
    await waitFor(() => {
      expect(copyServerFiltersButton).toBeEnabled();
    });

    fireEvent.click(copyServerFiltersButton);

    const successMessage = await screen.findByText("Copied server-applied filters to clipboard.");
    expect(successMessage).toBeInTheDocument();
    expect(successMessage).toHaveAttribute("role", "status");
    expect(successMessage).toHaveAttribute("aria-live", "polite");

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
  });

  it("runs read-only Blender inspection and renders the returned report", async () => {
    apiMocks.inspectAssetForgeBlenderArtifact.mockResolvedValueOnce(makeInspectReport());

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Candidate artifact path"), {
      target: { value: "candidates/sample.obj" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run read-only inspection" }));

    await waitFor(() => {
      expect(apiMocks.inspectAssetForgeBlenderArtifact).toHaveBeenCalledWith({
        artifact_path: "candidates/sample.obj",
      });
    });

    expect(await screen.findByText(/Inspection status: succeeded/i)).toBeInTheDocument();
    expect(screen.getByText(/Runtime root scoped: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/Script execution: executed/i)).toBeInTheDocument();
    expect(screen.getByText(/Artifact size bytes: 128/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspection cap bytes: 262144000/i)).toBeInTheDocument();
    expect(screen.getByText(/Read-only policy: true/i)).toBeInTheDocument();
  });

  it("creates an O3DE stage plan and renders deterministic plan paths", async () => {
    apiMocks.createAssetForgeO3DEStagePlan.mockResolvedValueOnce(makeStagePlanReport());

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create O3DE stage plan" }));

    await waitFor(() => {
      expect(apiMocks.createAssetForgeO3DEStagePlan).toHaveBeenCalledWith({
        candidate_id: "candidate-a",
        candidate_label: "Weathered Ivy Arch",
        desired_extension: "glb",
      });
    });

    expect(await screen.findByText(/Plan status: ready-for-approval/i)).toBeInTheDocument();
    expect(screen.getByText(/Project writes admitted: no/i)).toBeInTheDocument();
    expect(screen.getByText(/Manifest path: Assets\/Generated\/asset_forge/i)).toBeInTheDocument();
    expect(screen.getByText(/Allowed staging prefix: Assets\/Generated\/asset_forge\//i)).toBeInTheDocument();
    expect(screen.getByText(/Allowed output extensions: \.glb, \.gltf, \.fbx, \.obj/i)).toBeInTheDocument();
  });

  it("requires explicit approval for stage write and renders approval-required status", async () => {
    apiMocks.createAssetForgeO3DEStagePlan.mockResolvedValueOnce(makeStagePlanReport());
    apiMocks.executeAssetForgeO3DEStageWrite.mockResolvedValueOnce(
      makeStageWriteReport({
        write_status: "approval-required",
        approval_state: "not-approved",
        write_executed: false,
        project_write_admitted: false,
        destination_sha256: null,
        manifest_sha256: null,
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create O3DE stage plan" }));
    expect(await screen.findByText(/Plan status: ready-for-approval/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Execute stage write (approval-gated)" }));

    await waitFor(() => {
      expect(apiMocks.executeAssetForgeO3DEStageWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          approval_state: "not-approved",
          approval_note: "",
          stage_relative_path: expect.stringContaining("Assets/Generated/asset_forge/"),
        }),
      );
    });

    expect(await screen.findByText(/Write status: approval-required/i)).toBeInTheDocument();
    expect(screen.getByText(/Approval is required/i)).toBeInTheDocument();
  });

  it("executes stage write when approval is acknowledged and note is provided", async () => {
    apiMocks.createAssetForgeO3DEStagePlan.mockResolvedValueOnce(makeStagePlanReport());
    apiMocks.executeAssetForgeO3DEStageWrite.mockResolvedValueOnce(makeStageWriteReport());

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create O3DE stage plan" }));
    expect(await screen.findByText(/Plan status: ready-for-approval/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Approval note (required when approved)"), {
      target: { value: "Operator approved bounded source staging for review." },
    });
    fireEvent.click(screen.getByLabelText("Approval acknowledged for bounded stage write"));
    fireEvent.click(screen.getByRole("button", { name: "Execute stage write (approval-gated)" }));

    await waitFor(() => {
      expect(apiMocks.executeAssetForgeO3DEStageWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          approval_state: "approved",
          approval_note: "Operator approved bounded source staging for review.",
        }),
      );
    });

    expect(await screen.findByText(/Write status: succeeded/i)).toBeInTheDocument();
    expect(screen.getByText(/Write executed: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/Destination sidecar:/i)).toBeInTheDocument();
  });

  it("runs Packet 09 readback and renders assetdb/catalog evidence details", async () => {
    apiMocks.readAssetForgeO3DEIngestEvidence.mockResolvedValueOnce(makeReadbackReport());

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run read-only ingest evidence readback" }));

    await waitFor(() => {
      expect(apiMocks.readAssetForgeO3DEIngestEvidence).toHaveBeenCalledWith({
        candidate_id: "candidate-a",
        candidate_label: "Weathered Ivy Arch",
        source_asset_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
        selected_platform: "pc",
      });
    });

    expect(await screen.findByText(/Readback status: succeeded/i)).toBeInTheDocument();
    expect(screen.getByText(/Source found in assetdb: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/Assetdb freshness: fresh/i)).toBeInTheDocument();
    expect(screen.getByText(/Assetdb last write \(UTC\): 2026-04-28T00:00:00\+00:00/i)).toBeInTheDocument();
    expect(screen.getByText(/Catalog presence: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/Asset Processor job evidence/i)).toBeInTheDocument();
  });

  it("creates Packet 09.5 operator review packet and renders review details", async () => {
    apiMocks.createAssetForgeO3DEOperatorReviewPacket.mockResolvedValueOnce(
      makeReviewPacketReport({
        operator_decision: "approve_assignment_design_only",
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Operator decision"), {
      target: { value: "approve_assignment_design_only" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create operator review packet (Packet 09.5)" }));

    await waitFor(() => {
      expect(apiMocks.createAssetForgeO3DEOperatorReviewPacket).toHaveBeenCalledWith({
        candidate_id: "candidate-a",
        candidate_label: "Weathered Ivy Arch",
        source_asset_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
        provenance_metadata_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.forge.json",
        selected_platform: "pc",
        operator_decision: "approve_assignment_design_only",
      });
    });

    expect(await screen.findByText(/Review status: ready_for_operator_decision/i)).toBeInTheDocument();
    expect(screen.getByText(/Operator decision: approve_assignment_design_only/i)).toBeInTheDocument();
    expect(screen.getByText(/Review packet version: asset-forge-o3de-review-packet\/v1/i)).toBeInTheDocument();
    expect(screen.getByText(/Read-only: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/Mutation occurred: no/i)).toBeInTheDocument();
    expect(screen.getByText(/License name: CC-BY-4\.0/i)).toBeInTheDocument();
  });

  it("surfaces review-packet gate errors for blocked review status", async () => {
    apiMocks.createAssetForgeO3DEOperatorReviewPacket.mockResolvedValueOnce(
      makeReviewPacketReport({
        review_status: "missing_provenance",
        blocked_reason: "Provenance metadata is missing or invalid for the selected generated-asset candidate.",
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create operator review packet (Packet 09.5)" }));

    expect(
      await screen.findByText(
        /Review packet is blocked by missing readback evidence gates\. Resolve ingestion evidence and rerun\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Blocked reason: Provenance metadata is missing or invalid/i)).toBeInTheDocument();
  });

  it("creates Packet 10 placement plan and renders plan-only placement details", async () => {
    apiMocks.createAssetForgeO3DEPlacementPlan.mockResolvedValueOnce(makePlacementPlanReport());

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create plan-only placement target" }));

    await waitFor(() => {
      expect(apiMocks.createAssetForgeO3DEPlacementPlan).toHaveBeenCalledWith({
        candidate_id: "candidate-a",
        candidate_label: "Weathered Ivy Arch",
        staged_source_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
        target_level_relative_path: "Levels/BridgeLevel01/BridgeLevel01.prefab",
        target_entity_name: "AssetForgeCandidateA",
        target_component: "Mesh",
      });
    });

    expect(await screen.findByText(/Plan status: ready-for-approval/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement execution status: blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Target level: Levels\/BridgeLevel01\/BridgeLevel01\.prefab/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement writes admitted: no/i)).toBeInTheDocument();
    expect(screen.getByText(/Allowed stage prefix: Assets\/Generated\/asset_forge\//i)).toBeInTheDocument();
  });

  it("renders evidence index read-only and source metadata", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({
        read_only: true,
        capability_name: "asset_forge.o3de.placement.live_proof.evidence_index",
        runtime_root: "C:\\runtime\\asset_forge",
        source: "asset-forge-placement-live-proof-evidence-index",
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    expect(
      await screen.findByText(/Capability: asset_forge\.o3de\.placement\.live_proof\.evidence_index/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Read-only: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence source: asset-forge-placement-live-proof-evidence-index/i)).toBeInTheDocument();
    expect(screen.getByText(/Runtime root: C:\\runtime\\asset_forge/i)).toBeInTheDocument();
    expect(screen.getByText(/Server status filter applied: succeeded/i)).toBeInTheDocument();
    expect(screen.getByText(/Server candidate filter applied: candidate-a/i)).toBeInTheDocument();
    expect(screen.getByText(/Server age filter applied \(s\): 300/i)).toBeInTheDocument();
    expect(screen.getByText(/Server limit applied: 10/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Server filter digest: limit=10; status=succeeded; candidate=candidate-a; from_age_s=300/i),
    ).toBeInTheDocument();
  });

  it("runs Packet 11 placement proof gate and renders blocked proof status truthfully", async () => {
    apiMocks.createAssetForgeO3DEPlacementPlan.mockResolvedValueOnce(makePlacementPlanReport());
    apiMocks.executeAssetForgeO3DEPlacementProof.mockResolvedValueOnce(makePlacementProofReport());

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create plan-only placement target" }));
    expect(await screen.findByText(/Plan status: ready-for-approval/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Placement proof approval note"), {
      target: { value: "Operator approved exact Packet 11 proof gate." },
    });
    fireEvent.click(screen.getByLabelText("Approval acknowledged for narrow placement proof gate"));
    fireEvent.click(screen.getByRole("button", { name: "Run narrow placement proof gate (Packet 11)" }));

    await waitFor(() => {
      expect(apiMocks.executeAssetForgeO3DEPlacementProof).toHaveBeenCalledWith(
        expect.objectContaining({
          approval_state: "approved",
          approval_note: "Operator approved exact Packet 11 proof gate.",
          target_level_relative_path: "Levels/BridgeLevel01/BridgeLevel01.prefab",
        }),
      );
    });

    expect(await screen.findByText(/Proof status: blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Runtime proof gate enabled: no/i)).toBeInTheDocument();
    expect(screen.getByText(/Proof runtime gate env: ASSET_FORGE_ENABLE_PLACEMENT_PROOF/i)).toBeInTheDocument();
    expect(screen.getByText(/Write occurred: no/i)).toBeInTheDocument();
  });

  it("shows policy-loading status for provider lane while registry data is pending", () => {
    render(<AssetForgeStudioPacket01 policiesLoading />);

    expect(screen.getByText("Loading backend policy registry for provider lane.")).toBeInTheDocument();
  });

  it("maps lane chips/details from backend policy data when available", () => {
    render(
      <AssetForgeStudioPacket01
        policies={[
          makePolicy({
            tool: "asset.source.inspect",
            capability_status: "prompt-ready-read-only",
            real_admission_stage: "real-read-only-active",
            execution_mode: "real",
          }),
          makePolicy({
            tool: "editor.entity.create",
            capability_status: "prompt-ready-real-authoring",
            real_admission_stage: "real-editor-authoring-active",
            execution_mode: "real",
          }),
        ]}
      />,
    );

    expect(screen.getByText(/Backend policy asset\.source\.inspect:/i)).toBeInTheDocument();
    expect(screen.getByText(/General editor policy editor\.entity\.create/i)).toBeInTheDocument();
    expect(screen.getByText(/Review is backed by asset\.source\.inspect/i)).toBeInTheDocument();
  });

  it("shows provider preflight status and warnings in the settings panel", () => {
    render(<AssetForgeStudioPacket01 providerStatus={makeProviderStatus()} />);

    expect(screen.getByText(/Provider mode: mock/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider config ready: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider execution status: blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/No external provider task creation is admitted in Packet 04/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider mode mock, config ready yes, generation status blocked/i)).toBeInTheDocument();
  });

  it("shows Blender detected status as preflight-only with version evidence", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByText(/Executable status: C:\\Blender\\blender\.exe/i)).toBeInTheDocument();
    expect(screen.getByText(/Version status: Blender 4\.1\.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Prep execution status: blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Blender preflight detected/i)).toBeInTheDocument();
  });

  it("shows Blender missing status as blocked with missing preflight details", () => {
    render(
      <AssetForgeStudioPacket01
        blenderStatus={makeBlenderStatus({
          executable_found: false,
          executable_path: null,
          detection_source: "path-missing",
          version: null,
          version_probe_status: "missing",
          warnings: ["Blender executable not detected. Prep execution is blocked."],
        })}
      />,
    );

    expect(screen.getByText(/Executable status: Not detected \(path-missing\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Version status: Unknown \(missing\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Blender preflight missing \(path-missing\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Blender executable not detected\. Prep execution is blocked\./i)).toBeInTheDocument();
  });

  it("shows and clears the candidate debounce pending hint while filter input settles", async () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Candidate filter"), {
      target: { value: "candidate-b" },
    });

    const refreshButton = screen.getByRole("button", { name: "Refresh live-proof evidence index" });
    const last5mButton = screen.getByRole("button", { name: "Last 5m" });

    const debounceStatus = screen.getByText("Applying candidate filter...");
    expect(debounceStatus).toBeInTheDocument();
    expect(debounceStatus).toHaveAttribute("role", "status");
    expect(debounceStatus).toHaveAttribute("aria-live", "polite");
    expect(refreshButton).toBeDisabled();
    expect(last5mButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("title", "Wait for candidate filter debounce before refreshing.");
    expect(last5mButton).toHaveAttribute("title", "Wait for candidate filter debounce before applying age preset.");

    await waitFor(() => {
      expect(screen.queryByText("Applying candidate filter...")).not.toBeInTheDocument();
    }, { timeout: 2000 });

    expect(refreshButton).toBeEnabled();
    expect(last5mButton).toBeEnabled();
    expect(last5mButton).not.toHaveAttribute("title");
  });

  it("restores evidence filters from session storage and surfaces the restore hint", () => {
    window.sessionStorage.setItem(
      "asset-forge-packet01-evidence-filters-v1",
      JSON.stringify({
        limit: 15,
        status: "blocked",
        candidate: "candidate-c",
        from_age_s: "1800",
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    expect(screen.getByLabelText("Evidence index limit")).toHaveValue("15");
    expect(screen.getByLabelText("Status filter")).toHaveValue("blocked");
    expect(screen.getByLabelText("Candidate filter")).toHaveValue("candidate-c");
    expect(screen.getByLabelText("Max age seconds")).toHaveValue(1800);
    expect(screen.getByText("Filters restored from session storage.")).toBeInTheDocument();
  });

  it("applies server filters to UI controls and resolves mismatch status", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Evidence index limit"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Status filter"), { target: { value: "blocked" } });
    fireEvent.change(screen.getByLabelText("Candidate filter"), { target: { value: "candidate-z" } });
    fireEvent.change(screen.getByLabelText("Max age seconds"), { target: { value: "7200" } });

    const refreshButton = screen.getByRole("button", { name: "Refresh live-proof evidence index" });
    await waitFor(() => {
      expect(refreshButton).toBeEnabled();
    });
    fireEvent.click(refreshButton);

    expect(await screen.findByText("Filter sync: UI/server mismatch")).toBeInTheDocument();
    expect(screen.getByText("Server/UI filter mismatch: yes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply server filters to UI" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Evidence index limit")).toHaveValue("10");
      expect(screen.getByLabelText("Status filter")).toHaveValue("succeeded");
      expect(screen.getByLabelText("Candidate filter")).toHaveValue("candidate-a");
      expect(screen.getByLabelText("Max age seconds")).toHaveValue(300);
    });

    const statusMessage = screen.getByText("Applied server filters to UI controls.");
    expect(statusMessage).toBeInTheDocument();
    expect(statusMessage).toHaveAttribute("role", "status");
    expect(statusMessage).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Filter sync: UI matches server applied filters")).toBeInTheDocument();
    expect(screen.getByText("Server/UI filter mismatch: no")).toBeInTheDocument();
  });

  it("disables server-filter actions until evidence index report is loaded", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const copyServerFiltersButton = screen.getByRole("button", { name: "Copy applied filters (server)" });
    const applyServerFiltersButton = screen.getByRole("button", { name: "Apply server filters to UI" });

    expect(copyServerFiltersButton).toBeDisabled();
    expect(applyServerFiltersButton).toBeDisabled();
    expect(copyServerFiltersButton).toHaveAttribute("title", "Refresh evidence index first.");
    expect(applyServerFiltersButton).toHaveAttribute("title", "Refresh evidence index first.");
    expect(screen.getByText("Refresh evidence index to enable server-applied filter actions.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));
    await waitFor(() => {
      expect(copyServerFiltersButton).toBeEnabled();
      expect(applyServerFiltersButton).toBeEnabled();
    });
    expect(copyServerFiltersButton).not.toHaveAttribute("title");
    expect(applyServerFiltersButton).not.toHaveAttribute("title");
    expect(screen.queryByText("Refresh evidence index to enable server-applied filter actions.")).not.toBeInTheDocument();

    expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalled();
  });

  it("disables clear filters at defaults and enables it after filter changes", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const clearFiltersButton = screen.getByRole("button", { name: "Clear filters" });
    expect(clearFiltersButton).toBeDisabled();
    expect(clearFiltersButton).toHaveAttribute("title", "Filters already at defaults.");

    fireEvent.change(screen.getByLabelText("Status filter"), { target: { value: "blocked" } });
    expect(clearFiltersButton).toBeEnabled();
    expect(clearFiltersButton).not.toHaveAttribute("title");
  });

  it("disables apply pasted query until a non-empty query is entered", () => {
    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    const pasteQueryInput = screen.getByLabelText("Paste query (leading ? optional)");
    expect(pasteQueryInput).toHaveAttribute(
      "aria-describedby",
      "asset-forge-paste-query-help asset-forge-paste-query-example",
    );

    expect(
      screen.getByText("Accepted keys: limit, proof_status, candidate_id, from_age_s."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Example (leading ? optional): ?limit=10&proof_status=succeeded&candidate_id=candidate-a&from_age_s=1800"),
    ).toBeInTheDocument();

    const applyPastedQueryButton = screen.getByRole("button", { name: "Apply pasted query" });
    expect(applyPastedQueryButton).toBeDisabled();
    expect(applyPastedQueryButton).toHaveAttribute("title", "Paste a query string to enable this action.");

    fireEvent.change(pasteQueryInput, {
      target: { value: "    " },
    });
    expect(applyPastedQueryButton).toBeDisabled();

    fireEvent.change(pasteQueryInput, {
      target: { value: " ?limit=15&proof_status=blocked " },
    });
    expect(applyPastedQueryButton).toBeEnabled();
    expect(applyPastedQueryButton).not.toHaveAttribute("title");
  });

  it("shows applying query label while pasted query refresh is in flight", async () => {
    let resolveReport: (value: AssetForgePlacementEvidenceIndexRecord) => void = () => {
      throw new Error("Expected refresh promise resolver to be assigned.");
    };
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveReport = resolve;
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    expect(screen.getByRole("button", { name: "Applying query..." })).toBeDisabled();

    resolveReport(makeEvidenceIndexReport());

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Apply pasted query" })).toBeEnabled();
    });
  });

  it("shows empty evidence-state message when refresh returns zero items", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({
        index_status: "empty",
        fresh_item_count: 0,
        items: [],
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    const emptyState = await screen.findByText("No evidence items matched current filters.");
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveAttribute("role", "status");
    expect(emptyState).toHaveAttribute("aria-live", "polite");
  });

  it("renders evidence warnings from the server report", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({
        warnings: [
          "Evidence index is read-only.",
          "Freshness labels are advisory until runtime clock sync is verified.",
        ],
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    expect(await screen.findByText("Evidence warnings")).toBeInTheDocument();
    expect(screen.getByText("Evidence index is read-only.")).toBeInTheDocument();
    expect(
      screen.getByText("Freshness labels are advisory until runtime clock sync is verified."),
    ).toBeInTheDocument();
  });

  it("shows truncation note when evidence index returns more than visible item limit", async () => {
    const manyItems = Array.from({ length: 6 }, (_, idx) => ({
      path: `C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-${idx}.json`,
      recorded_at: "2026-04-28T00:00:00+00:00",
      candidate_id: `candidate-${idx}`,
      bridge_command_id: `bridge-00${idx}`,
      proof_status: "succeeded" as const,
      age_seconds: 10 + idx,
    }));
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({ items: manyItems, fresh_item_count: 6 }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    expect(
      await screen.findByText("Showing first 5 of 6 evidence items."),
    ).toBeInTheDocument();
    expect(screen.getByText("Displayed items: 5 of 6")).toBeInTheDocument();
  });

  it("shows visible evidence age range in seconds", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({
        items: [
          {
            path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-a.json",
            recorded_at: "2026-04-28T00:00:00+00:00",
            candidate_id: "candidate-a",
            bridge_command_id: "bridge-001",
            proof_status: "succeeded",
            age_seconds: 42,
          },
          {
            path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-b.json",
            recorded_at: "2026-04-28T00:00:00+00:00",
            candidate_id: "candidate-b",
            bridge_command_id: "bridge-002",
            proof_status: "blocked",
            age_seconds: 99,
          },
        ],
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    expect(await screen.findByText(/Visible age range \(s\): newest 42, oldest 99/i)).toBeInTheDocument();
    expect(screen.getByText(/Computed freshness ratio \(current view\): 2\/2/i)).toBeInTheDocument();
    expect(screen.getByText(/Computed stale items \(current view\): 0/i)).toBeInTheDocument();
  });

  it("shows computed stale item count for visible evidence", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({
        freshness_window_seconds: 1800,
        items: [
          {
            path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-a.json",
            recorded_at: "2026-04-28T00:00:00+00:00",
            candidate_id: "candidate-a",
            bridge_command_id: "bridge-001",
            proof_status: "succeeded",
            age_seconds: 42,
          },
          {
            path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-b.json",
            recorded_at: "2026-04-28T00:00:00+00:00",
            candidate_id: "candidate-b",
            bridge_command_id: "bridge-002",
            proof_status: "blocked",
            age_seconds: 2500,
          },
        ],
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    expect(await screen.findByText("Computed stale items (current view): 1")).toBeInTheDocument();
    expect(screen.getByText("Computed freshness ratio (current view): 1/2")).toBeInTheDocument();
    expect(screen.getByText("Computed freshness percent (current view): 50%")).toBeInTheDocument();
    expect(screen.getByText("Computed stale percent (current view): 50%")).toBeInTheDocument();
    expect(screen.getByText("Evidence accounting balanced: yes")).toBeInTheDocument();
  });

  it("shows count of visible evidence items with unknown age metadata", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({
        items: [
          {
            path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-a.json",
            recorded_at: "2026-04-28T00:00:00+00:00",
            candidate_id: "candidate-a",
            bridge_command_id: "bridge-001",
            proof_status: "succeeded",
            age_seconds: 42,
          },
          {
            path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-b.json",
            recorded_at: "2026-04-28T00:00:00+00:00",
            candidate_id: "candidate-b",
            bridge_command_id: "bridge-002",
            proof_status: "blocked",
            age_seconds: null,
          },
        ],
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    expect(await screen.findByText("Visible items with unknown age: 1")).toBeInTheDocument();
    expect(screen.getByText("Age coverage (current view): 1/2")).toBeInTheDocument();
  });

  it("surfaces a freshness mismatch warning when computed and reported fresh counts differ", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport({
        fresh_item_count: 0,
        freshness_window_seconds: 1800,
        items: [
          {
            path: "C:\\runtime\\asset_forge\\placement_live_proof\\evidence\\candidate-a.json",
            recorded_at: "2026-04-28T00:00:00+00:00",
            candidate_id: "candidate-a",
            bridge_command_id: "bridge-001",
            proof_status: "succeeded",
            age_seconds: 42,
          },
        ],
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    expect(await screen.findByText(/Computed fresh items \(current view\): 1/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Fresh-item mismatch: server reported 0, current view computed 1\./i),
    ).toBeInTheDocument();
  });

  it("shows refresh in-progress tooltip while evidence refresh request is running", async () => {
    let resolveReport: (value: AssetForgePlacementEvidenceIndexRecord) => void = () => {
      throw new Error("Expected refresh promise resolver to be assigned.");
    };
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveReport = resolve;
      }),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    const refreshingButton = screen.getByRole("button", { name: "Refreshing..." });
    const last5mButton = screen.getByRole("button", { name: "Last 5m" });
    expect(refreshingButton).toBeDisabled();
    expect(refreshingButton).toHaveAttribute("title", "Refresh in progress.");
    expect(last5mButton).toBeDisabled();
    expect(last5mButton).toHaveAttribute("title", "Refresh in progress.");

    resolveReport(makeEvidenceIndexReport());

    await waitFor(() => {
      const refreshedButton = screen.getByRole("button", { name: "Refresh live-proof evidence index" });
      expect(refreshedButton).toBeEnabled();
      expect(refreshedButton).not.toHaveAttribute("title");
      const enabledLast5mButton = screen.getByRole("button", { name: "Last 5m" });
      expect(enabledLast5mButton).toBeEnabled();
      expect(enabledLast5mButton).not.toHaveAttribute("title");
    });
  });

  it("renders evidence refresh errors as live status messages", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockRejectedValueOnce(
      new Error("Evidence index backend unavailable."),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh live-proof evidence index" }));

    const errorMessage = await screen.findByText("Evidence index backend unavailable.");
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute("role", "status");
    expect(errorMessage).toHaveAttribute("aria-live", "polite");
  });

  it("renders pasted-query failure feedback as a live status message", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockRejectedValueOnce(
      new Error("Query parse failed upstream."),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    const failureMessage = await screen.findByText("Failed to apply query: Query parse failed upstream.");
    expect(failureMessage).toBeInTheDocument();
    expect(failureMessage).toHaveAttribute("role", "status");
    expect(failureMessage).toHaveAttribute("aria-live", "polite");
  });

  it("renders pasted-query success feedback as a live status message", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    const successMessage = await screen.findByText("Applied pasted query.");
    expect(successMessage).toBeInTheDocument();
    expect(successMessage).toHaveAttribute("role", "status");
    expect(successMessage).toHaveAttribute("aria-live", "polite");
  });

  it("clamps pasted query from_age_s to the supported upper bound before request", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&from_age_s=999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "",
        86400,
      );
    });
  });

  it("clamps pasted query from_age_s to zero when a negative value is provided", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&from_age_s=-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "",
        0,
      );
    });
  });

  it("clamps pasted query limit to the minimum supported value before request", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=0&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        1,
        "succeeded",
        "",
        undefined,
      );
    });
  });

  it("clamps pasted query limit to the maximum supported value before request", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=999&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        25,
        "succeeded",
        "",
        undefined,
      );
    });
  });

  it("trims pasted query candidate_id before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&candidate_id=%20candidate-a%20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "candidate-a",
        undefined,
      );
    });
  });

  it("trims pasted query proof_status before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=%20blocked%20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "blocked",
        "",
        undefined,
      );
    });
  });

  it("ignores non-numeric pasted from_age_s before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&from_age_s=not-a-number" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "",
        undefined,
      );
    });
  });

  it("normalizes blank pasted candidate_id to empty string before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&candidate_id=%20%20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "",
        undefined,
      );
    });
  });

  it("normalizes blank pasted proof_status to empty string before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=%20%20&candidate_id=candidate-a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "",
        "candidate-a",
        undefined,
      );
    });
  });

  it("falls back to default limit when pasted query limit is non-numeric", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=abc&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "",
        undefined,
      );
    });
  });

  it("defaults pasted query limit to 10 when limit is omitted", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?proof_status=succeeded&candidate_id=candidate-a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "candidate-a",
        undefined,
      );
    });
  });

  it("accepts pasted query text without a leading question mark", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "limit=15&proof_status=blocked&candidate_id=candidate-b" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        15,
        "blocked",
        "candidate-b",
        undefined,
      );
    });
  });

  it("ignores unknown pasted query keys while applying known filters", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=12&proof_status=blocked&candidate_id=candidate-z&unexpected=1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        12,
        "blocked",
        "candidate-z",
        undefined,
      );
    });
  });

  it("coerces pasted decimal limit to an integer before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=12.9&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        12,
        "succeeded",
        "",
        undefined,
      );
    });
  });

  it("coerces pasted decimal from_age_s to an integer before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&from_age_s=42.8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "",
        42,
      );
    });
  });

  it("accepts signed numeric pasted from_age_s and dispatches normalized value", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&from_age_s=%2B120" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "",
        120,
      );
    });
  });

  it("accepts signed numeric pasted limit and dispatches normalized value", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=%2B7&proof_status=blocked" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        7,
        "blocked",
        "",
        undefined,
      );
    });
  });

  it("uses the first value when pasted query contains duplicate keys", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=5&limit=22&proof_status=blocked&proof_status=succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        5,
        "blocked",
        "",
        undefined,
      );
    });
  });

  it("decodes URL-encoded candidate_id characters before request dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&candidate_id=candidate%2Fa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "candidate/a",
        undefined,
      );
    });
  });

  it("decodes and trims URL-encoded surrounding whitespace in candidate_id", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&candidate_id=%20candidate-b%20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "candidate-b",
        undefined,
      );
    });
  });

  it("decodes plus signs in pasted candidate_id as spaces before dispatch", async () => {
    apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex.mockResolvedValueOnce(
      makeEvidenceIndexReport(),
    );

    render(<AssetForgeStudioPacket01 blenderStatus={makeBlenderStatus()} />);

    fireEvent.change(screen.getByLabelText("Paste query (leading ? optional)"), {
      target: { value: "?limit=10&proof_status=succeeded&candidate_id=candidate+z" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply pasted query" }));

    await waitFor(() => {
      expect(apiMocks.getAssetForgeO3DEPlacementLiveProofEvidenceIndex).toHaveBeenCalledWith(
        10,
        "succeeded",
        "candidate z",
        undefined,
      );
    });
  });
});
