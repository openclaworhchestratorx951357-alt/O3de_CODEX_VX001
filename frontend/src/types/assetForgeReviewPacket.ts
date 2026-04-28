export type AssetForgeReviewPacketSource =
  | "typed_fixture_data"
  | "existing_frontend_packet_data"
  | "live_phase9_packet_data";

export type AssetForgeReviewPacketOriginKind =
  | "typed_fixture_preview"
  | "existing_frontend_packet_payload"
  | "selected_artifact_metadata"
  | "selected_execution_details"
  | "selected_run_execution_details"
  | "unknown_live_packet_origin";

export interface AssetForgeReviewPacketOrigin {
  kind: AssetForgeReviewPacketOriginKind;
  label: string;
  detail: string;
  runId?: string | null;
  executionId?: string | null;
  artifactId?: string | null;
  capturedAtIso?: string | null;
  capturedAtSource?: string | null;
}

export type AssetForgePacketLane = "artifact" | "execution" | "run";

export interface AssetForgePacketLaneAttempt {
  lane: AssetForgePacketLane;
  label: string;
  hasPayload: boolean;
  hasReviewPacket: boolean;
  reason: string;
}

export interface AssetForgePacketResolutionDiagnostics {
  selectedRecordsSurface: "runs" | "executions" | "artifacts" | "events" | "unknown";
  preferredOrder: AssetForgePacketLane[];
  resolvedLane: AssetForgePacketLane | null;
  summary: string;
  attempts: AssetForgePacketLaneAttempt[];
}

export interface Phase9AssetReadbackReviewPacketSelectedProject {
  project_root?: string | null;
  project_json_path?: string | null;
  project_name?: string | null;
}

export interface Phase9AssetReadbackReviewPacketSelectedPlatform {
  platform?: string | null;
  cache_path?: string | null;
  asset_catalog_path?: string | null;
  asset_catalog_freshness_status?: string | null;
}

export interface Phase9AssetReadbackReviewPacketAssetDatabase {
  path?: string | null;
  read_mode?: string | null;
  freshness_status?: string | null;
}

export interface Phase9AssetReadbackReviewPacketSourceEvidence {
  original_source_path?: string | null;
  normalized_source_path?: string | null;
  source_id?: number | null;
  source_guid?: string | null;
  source_exists?: boolean | null;
  source_is_file?: boolean | null;
}

export interface Phase9AssetReadbackReviewPacketProductsEvidence {
  product_path?: string | null;
  product_id?: number | null;
  product_sub_id?: number | null;
  product_rows?: unknown[];
  product_count?: number | null;
  evidence_available?: boolean | null;
}

export interface Phase9AssetReadbackReviewPacketDependenciesEvidence {
  dependency_rows?: unknown[];
  dependency_count?: number | null;
  evidence_available?: boolean | null;
}

export interface Phase9AssetReadbackReviewPacketCatalogEvidence {
  catalog_presence?: boolean | null;
  asset_catalog_product_path_presence?: string[];
  asset_catalog_product_path_count?: number | null;
}

export interface Phase9AssetReadbackReviewPacketForgeHandoff {
  generated_asset_id?: string | null;
  asset_slug?: string | null;
  generation_backend?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  prompt?: string | null;
  source_asset_path?: string | null;
  product_asset_path?: string | null;
  catalog_presence?: boolean | null;
  operator_approval_state?: string | null;
  license_status?: string | null;
  quality_status?: string | null;
  placement_readiness?: string | null;
  production_approval_state?: string | null;
}

export interface Phase9AssetReadbackReviewPacket {
  capability?: string | null;
  review_contract_version?: string | null;
  readiness_status?: string | null;
  proof_status?: string | null;
  read_only?: boolean | null;
  mutation_occurred?: boolean | null;
  selected_project?: Phase9AssetReadbackReviewPacketSelectedProject;
  selected_platform?: Phase9AssetReadbackReviewPacketSelectedPlatform;
  asset_database?: Phase9AssetReadbackReviewPacketAssetDatabase;
  source?: Phase9AssetReadbackReviewPacketSourceEvidence;
  products?: Phase9AssetReadbackReviewPacketProductsEvidence;
  dependencies?: Phase9AssetReadbackReviewPacketDependenciesEvidence;
  catalog?: Phase9AssetReadbackReviewPacketCatalogEvidence;
  warnings?: string[];
  blocked_reason?: string | null;
  missing_substrate_guidance?: string | null;
  safest_next_step?: string | null;
  operator_approval_state?: string | null;
  forge_handoff?: Phase9AssetReadbackReviewPacketForgeHandoff;
}

export interface AssetForgeToolbenchReviewPacketViewModel {
  dataSourceLabel: string;
  hasResolvedPacket: boolean;
  packetResolutionState: "resolved" | "unresolved_live" | "unresolved_non_live";
  packetResolutionLabel: string;
  packetResolutionDetail: string;
  capability: string;
  contractVersion: string;
  readbackStatus: string;
  readinessStatus: string;
  proofStatus: string;
  selectedProject: {
    projectName: string;
    projectRoot: string;
    projectJsonPath: string;
  };
  selectedPlatform: {
    platform: string;
    cachePath: string;
    assetCatalogPath: string;
  };
  sourceEvidence: {
    originalSourcePath: string;
    normalizedSourcePath: string;
    sourceId: string;
    sourceGuid: string;
    sourceExists: string;
    sourceIsFile: string;
  };
  productEvidence: {
    productPath: string;
    productId: string;
    productSubId: string;
    productCount: string;
    evidenceAvailable: string;
    evidenceRows: string[];
  };
  dependencyEvidence: {
    dependencyCount: string;
    evidenceAvailable: string;
    evidenceRows: string[];
  };
  catalogEvidence: {
    catalogPresence: string;
    catalogProductPathCount: string;
    catalogProductPaths: string[];
  };
  freshnessStatus: {
    assetDatabaseFreshness: string;
    assetCatalogFreshness: string;
  };
  mutationFlags: {
    readOnly: string;
    mutationOccurred: string;
  };
  warnings: string[];
  blockedReason: string;
  missingSubstrateGuidance: string;
  safestNextStep: string;
  operatorApprovalState: string;
  unavailableFields: {
    licenseStatus: string;
    qualityStatus: string;
    placementReadiness: string;
    productionApproval: string;
  };
}
