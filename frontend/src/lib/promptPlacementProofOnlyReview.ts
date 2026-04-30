import type { PromptSessionRecord } from "../types/contracts";

export type PlacementProofOnlyReviewSnapshot = {
  capabilityName: string;
  proofStatus?: string;
  candidateId?: string;
  candidateLabel?: string;
  artifactId?: string;
  artifactLabel?: string;
  stagedSourceRelativePath?: string;
  targetLevelRelativePath?: string;
  targetEntityName?: string;
  targetComponent?: string;
  stageWriteEvidenceReference?: string;
  stageWriteReadbackReference?: string;
  stageWriteReadbackStatus?: string;
  executionMode?: string;
  inspectionSurface?: string;
  executionAdmitted?: boolean;
  placementWriteAdmitted?: boolean;
  mutationOccurred?: boolean;
  readOnly?: boolean;
  failClosedReasons: string[];
  serverDecisionCode?: string;
  serverDecisionState?: string;
  serverStatus?: string;
  serverReason?: string;
  serverRemediation?: string;
};

export function summarizePlacementProofOnlyReview(
  session: PromptSessionRecord,
): PlacementProofOnlyReviewSnapshot | null {
  for (const response of session.latest_child_responses) {
    const responseRecord = asRecord(response);
    if (!responseRecord) {
      continue;
    }
    const result = asRecord(responseRecord.result);
    const executionDetails = asRecord(responseRecord.execution_details);
    const capabilityName = readString(executionDetails, "capability_name");
    const resultTool = readString(result, "tool") ?? readString(responseRecord, "tool");

    if (capabilityName !== "editor.placement.proof_only" && resultTool !== "editor.placement.proof_only") {
      continue;
    }

    const serverApprovalEvaluation = asRecord(executionDetails?.server_approval_evaluation);
    const decisionCode = readString(serverApprovalEvaluation, "decision_code");

    return {
      capabilityName: capabilityName ?? "editor.placement.proof_only",
      proofStatus: readString(executionDetails, "proof_status"),
      candidateId: readString(executionDetails, "candidate_id"),
      candidateLabel: readString(executionDetails, "candidate_label"),
      artifactId:
        readString(executionDetails, "artifact_id")
        ?? readString(executionDetails, "proof_artifact_id")
        ?? readString(result, "artifact_id")
        ?? readString(responseRecord, "artifact_id"),
      artifactLabel:
        readString(executionDetails, "artifact_label")
        ?? readString(result, "artifact_label")
        ?? readString(responseRecord, "artifact_label"),
      stagedSourceRelativePath: readString(executionDetails, "staged_source_relative_path"),
      targetLevelRelativePath: readString(executionDetails, "target_level_relative_path"),
      targetEntityName: readString(executionDetails, "target_entity_name"),
      targetComponent: readString(executionDetails, "target_component"),
      stageWriteEvidenceReference: readString(executionDetails, "stage_write_evidence_reference"),
      stageWriteReadbackReference: readString(executionDetails, "stage_write_readback_reference"),
      stageWriteReadbackStatus: readString(executionDetails, "stage_write_readback_status"),
      executionMode: readString(result, "execution_mode") ?? readString(responseRecord, "execution_mode"),
      inspectionSurface: readString(executionDetails, "source") ?? readString(executionDetails, "inspection_surface"),
      executionAdmitted: readBoolean(executionDetails, "execution_admitted"),
      placementWriteAdmitted: readBoolean(executionDetails, "placement_write_admitted"),
      mutationOccurred: readBoolean(executionDetails, "mutation_occurred"),
      readOnly: readBoolean(executionDetails, "read_only"),
      failClosedReasons: readStringArray(executionDetails, "fail_closed_reasons"),
      serverDecisionCode: decisionCode,
      serverDecisionState: readString(serverApprovalEvaluation, "decision_state"),
      serverStatus: readString(serverApprovalEvaluation, "status"),
      serverReason: readString(serverApprovalEvaluation, "reason"),
      serverRemediation: extractServerBlockerRemediation(session.final_result_summary, decisionCode),
    };
  }

  return null;
}

function extractServerBlockerRemediation(
  finalResultSummary: string | null | undefined,
  decisionCode: string | undefined,
): string | undefined {
  if (!finalResultSummary) {
    return undefined;
  }

  const marker = decisionCode
    ? `Server blocker remediation (${decisionCode}): `
    : "Server blocker remediation:";
  const markerIndex = finalResultSummary.indexOf(marker);
  if (markerIndex < 0) {
    return undefined;
  }

  const startIndex = markerIndex + marker.length;
  const tail = finalResultSummary.slice(startIndex).trim();
  const stopMarkers = [
    " No editor placement runtime command was admitted or executed.",
    " Placement proof-only remains fail-closed",
  ];

  let endIndex = tail.length;
  for (const stopMarker of stopMarkers) {
    const markerPosition = tail.indexOf(stopMarker);
    if (markerPosition >= 0) {
      endIndex = Math.min(endIndex, markerPosition);
    }
  }

  return tail.slice(0, endIndex).trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  if (!record) {
    return undefined;
  }

  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | undefined {
  if (!record) {
    return undefined;
  }

  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(record: Record<string, unknown> | null, key: string): string[] {
  if (!record) {
    return [];
  }

  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
