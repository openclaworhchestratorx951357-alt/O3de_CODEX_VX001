import type {
  AssetForgeReviewPacketSource,
  AssetForgeToolbenchReviewPacketViewModel,
  Phase9AssetReadbackReviewPacket,
} from "../types/assetForgeReviewPacket";

const UNKNOWN_VALUE = "Unknown / unavailable";
const UNKNOWN_NOT_APPROVED_VALUE = "Unknown / unavailable (not approved)";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function asEvidenceField(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function summarizeEvidenceRecord(record: Record<string, unknown>): string {
  const preferredKeys = [
    "product_path",
    "dependency_path",
    "path",
    "source_path",
    "product_id",
    "product_sub_id",
    "dependency_type",
    "platform",
  ] as const;
  const parts: string[] = [];

  preferredKeys.forEach((key) => {
    const value = asEvidenceField(record[key]);
    if (value) {
      parts.push(`${key}=${value}`);
    }
  });

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  const fallbackEntry = Object.entries(record).find(([, value]) => asEvidenceField(value) !== null);
  if (!fallbackEntry) {
    return "Row object present (display fields unavailable)";
  }
  const [key, rawValue] = fallbackEntry;
  const fallbackValue = asEvidenceField(rawValue) ?? UNKNOWN_VALUE;
  return `${key}=${fallbackValue}`;
}

function summarizeEvidenceRow(entry: unknown): string {
  const directValue = asEvidenceField(entry);
  if (directValue) {
    return directValue;
  }
  const record = asRecord(entry);
  if (record) {
    return summarizeEvidenceRecord(record);
  }
  return "Row present (unsupported type)";
}

function asEvidenceRows(value: unknown, prefix: string): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .slice(0, 5)
    .map((entry, index) => `${prefix} ${index + 1}: ${summarizeEvidenceRow(entry)}`);
}

function fallback(value: string | null | undefined, fallbackValue = UNKNOWN_VALUE): string {
  return value ?? fallbackValue;
}

function numberToDisplay(value: number | null): string {
  return value === null ? UNKNOWN_VALUE : String(value);
}

function booleanToDisplay(value: boolean | null): string {
  if (value === true) {
    return "Yes";
  }
  if (value === false) {
    return "No";
  }
  return UNKNOWN_VALUE;
}

function normalizeOperatorApprovalState(value: string | null): string {
  switch (value) {
    case "approved":
      return "Approved (operator-confirmed)";
    case "pending":
      return "Pending operator decision";
    case "rejected":
      return "Rejected by operator";
    case "not_requested":
      return "Not requested (not approved)";
    default:
      return UNKNOWN_NOT_APPROVED_VALUE;
  }
}

function sourceLabel(source: AssetForgeReviewPacketSource): string {
  switch (source) {
    case "live_phase9_packet_data":
      return "Live Phase 9 packet data (read-only)";
    case "existing_frontend_packet_data":
      return "Existing frontend packet data (read-only)";
    case "typed_fixture_data":
    default:
      return "Typed sample fixture data (read-only preview; not live)";
  }
}

function parsePacketRecord(record: Record<string, unknown>): Phase9AssetReadbackReviewPacket {
  return {
    capability: asString(record.capability),
    review_contract_version: asString(record.review_contract_version),
    readiness_status: asString(record.readiness_status),
    proof_status: asString(record.proof_status),
    read_only: asBoolean(record.read_only),
    mutation_occurred: asBoolean(record.mutation_occurred),
    selected_project: (asRecord(record.selected_project) as Phase9AssetReadbackReviewPacket["selected_project"]) ?? undefined,
    selected_platform: (asRecord(record.selected_platform) as Phase9AssetReadbackReviewPacket["selected_platform"]) ?? undefined,
    asset_database: (asRecord(record.asset_database) as Phase9AssetReadbackReviewPacket["asset_database"]) ?? undefined,
    source: (asRecord(record.source) as Phase9AssetReadbackReviewPacket["source"]) ?? undefined,
    products: (asRecord(record.products) as Phase9AssetReadbackReviewPacket["products"]) ?? undefined,
    dependencies: (asRecord(record.dependencies) as Phase9AssetReadbackReviewPacket["dependencies"]) ?? undefined,
    catalog: (asRecord(record.catalog) as Phase9AssetReadbackReviewPacket["catalog"]) ?? undefined,
    warnings: asStringArray(record.warnings),
    blocked_reason: asString(record.blocked_reason),
    missing_substrate_guidance: asString(record.missing_substrate_guidance),
    safest_next_step: asString(record.safest_next_step),
    operator_approval_state: asString(record.operator_approval_state),
    forge_handoff: (asRecord(record.forge_handoff) as Phase9AssetReadbackReviewPacket["forge_handoff"]) ?? undefined,
  };
}

export function resolveAssetReadbackReviewPacket(payload: unknown): Phase9AssetReadbackReviewPacket | null {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const nestedPacket = asRecord(record.asset_readback_review_packet);
  if (nestedPacket) {
    return parsePacketRecord(nestedPacket);
  }

  if (asString(record.capability) === "asset.source.inspect" || record.selected_project || record.source || record.catalog) {
    return parsePacketRecord(record);
  }

  return null;
}

export function mapAssetForgeToolbenchReviewPacket(
  payload: unknown,
  source: AssetForgeReviewPacketSource,
): AssetForgeToolbenchReviewPacketViewModel {
  const packet = resolveAssetReadbackReviewPacket(payload);
  const selectedProject = packet?.selected_project ?? {};
  const selectedPlatform = packet?.selected_platform ?? {};
  const assetDatabase = packet?.asset_database ?? {};
  const sourceEvidence = packet?.source ?? {};
  const productEvidence = packet?.products ?? {};
  const dependencyEvidence = packet?.dependencies ?? {};
  const catalogEvidence = packet?.catalog ?? {};
  const forgeHandoff = packet?.forge_handoff ?? {};

  const readbackStatus = packet?.proof_status === "asset_source_inspect_proven"
    ? "Read-only proof present"
    : "Partial or blocked readback evidence";

  return {
    dataSourceLabel: sourceLabel(source),
    capability: fallback(packet?.capability),
    contractVersion: fallback(packet?.review_contract_version),
    readbackStatus,
    readinessStatus: fallback(packet?.readiness_status),
    proofStatus: fallback(packet?.proof_status),
    selectedProject: {
      projectName: fallback(asString(selectedProject.project_name)),
      projectRoot: fallback(asString(selectedProject.project_root)),
      projectJsonPath: fallback(asString(selectedProject.project_json_path)),
    },
    selectedPlatform: {
      platform: fallback(asString(selectedPlatform.platform)),
      cachePath: fallback(asString(selectedPlatform.cache_path)),
      assetCatalogPath: fallback(asString(selectedPlatform.asset_catalog_path)),
    },
    sourceEvidence: {
      originalSourcePath: fallback(asString(sourceEvidence.original_source_path)),
      normalizedSourcePath: fallback(asString(sourceEvidence.normalized_source_path)),
      sourceId: numberToDisplay(asNumber(sourceEvidence.source_id)),
      sourceGuid: fallback(asString(sourceEvidence.source_guid)),
      sourceExists: booleanToDisplay(asBoolean(sourceEvidence.source_exists)),
      sourceIsFile: booleanToDisplay(asBoolean(sourceEvidence.source_is_file)),
    },
    productEvidence: {
      productPath: fallback(asString(productEvidence.product_path)),
      productId: numberToDisplay(asNumber(productEvidence.product_id)),
      productSubId: numberToDisplay(asNumber(productEvidence.product_sub_id)),
      productCount: numberToDisplay(asNumber(productEvidence.product_count)),
      evidenceAvailable: booleanToDisplay(asBoolean(productEvidence.evidence_available)),
      evidenceRows: asEvidenceRows(productEvidence.product_rows, "Product row"),
    },
    dependencyEvidence: {
      dependencyCount: numberToDisplay(asNumber(dependencyEvidence.dependency_count)),
      evidenceAvailable: booleanToDisplay(asBoolean(dependencyEvidence.evidence_available)),
      evidenceRows: asEvidenceRows(dependencyEvidence.dependency_rows, "Dependency row"),
    },
    catalogEvidence: {
      catalogPresence: booleanToDisplay(asBoolean(catalogEvidence.catalog_presence)),
      catalogProductPathCount: numberToDisplay(asNumber(catalogEvidence.asset_catalog_product_path_count)),
      catalogProductPaths: asStringArray(catalogEvidence.asset_catalog_product_path_presence),
    },
    freshnessStatus: {
      assetDatabaseFreshness: fallback(asString(assetDatabase.freshness_status)),
      assetCatalogFreshness: fallback(asString(selectedPlatform.asset_catalog_freshness_status)),
    },
    mutationFlags: {
      readOnly: booleanToDisplay(asBoolean(packet?.read_only)),
      mutationOccurred: booleanToDisplay(asBoolean(packet?.mutation_occurred)),
    },
    warnings: packet?.warnings ?? [],
    blockedReason: fallback(packet?.blocked_reason),
    missingSubstrateGuidance: fallback(packet?.missing_substrate_guidance),
    safestNextStep: fallback(packet?.safest_next_step),
    operatorApprovalState: normalizeOperatorApprovalState(packet?.operator_approval_state ?? null),
    unavailableFields: {
      licenseStatus: fallback(asString(forgeHandoff.license_status), UNKNOWN_NOT_APPROVED_VALUE),
      qualityStatus: fallback(asString(forgeHandoff.quality_status), UNKNOWN_NOT_APPROVED_VALUE),
      placementReadiness: fallback(asString(forgeHandoff.placement_readiness), "Blocked until a later admitted corridor"),
      productionApproval: fallback(asString(forgeHandoff.production_approval_state), UNKNOWN_NOT_APPROVED_VALUE),
    },
  };
}
