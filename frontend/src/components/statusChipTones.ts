import type { StatusChipTone } from "./StatusChip";

export function getApprovalStatusTone(status: string): StatusChipTone {
  if (status === "approved") {
    return "success";
  }
  if (status === "rejected") {
    return "danger";
  }
  if (status === "pending") {
    return "warning";
  }
  return "neutral";
}

export function getRunStatusTone(status: string): StatusChipTone {
  if (status === "succeeded") {
    return "success";
  }
  if (status === "failed" || status === "rejected" || status === "blocked") {
    return "danger";
  }
  if (status === "waiting_approval" || status === "pending" || status === "running") {
    return "warning";
  }
  return "neutral";
}

export function getExecutionStatusTone(status: string): StatusChipTone {
  return getRunStatusTone(status);
}

export function getExecutionModeTone(mode: string): StatusChipTone {
  if (mode === "real") {
    return "success";
  }
  if (mode === "simulated") {
    return "warning";
  }
  return "neutral";
}

export function getCapabilityTone(capability: string): StatusChipTone {
  if (capability === "real-authoring") {
    return "success";
  }
  if (capability === "runtime-candidate") {
    return "info";
  }
  if (capability === "runtime-reaching") {
    return "warning";
  }
  if (capability === "hybrid-read-only") {
    return "info";
  }
  if (capability === "plan-only") {
    return "warning";
  }
  if (capability === "mutation-gated") {
    return "danger";
  }
  return "neutral";
}

export function getAuditStatusTone(status: string): StatusChipTone {
  if (status === "succeeded") {
    return "success";
  }
  if (status === "blocked" || status === "rolled_back") {
    return "danger";
  }
  if (status === "preflight" || status === "simulated" || status === "unknown") {
    return "warning";
  }
  return "neutral";
}

export function getSeverityTone(severity: string): StatusChipTone {
  if (severity === "error") {
    return "danger";
  }
  if (severity === "warning") {
    return "warning";
  }
  if (severity === "info") {
    return "info";
  }
  return "neutral";
}

export function getAdapterModeTone(mode: string): StatusChipTone {
  return getExecutionModeTone(mode);
}

export function getAdmissionTone(stage: string): StatusChipTone {
  if (stage.includes("real")) {
    return "success";
  }
  if (stage.includes("plan") || stage.includes("candidate")) {
    return "warning";
  }
  return "neutral";
}

export function getSchemaModeTone(mode: string): StatusChipTone {
  if (mode === "active" || mode === "real") {
    return "success";
  }
  if (mode === "hybrid" || mode === "plan-only") {
    return "warning";
  }
  return "neutral";
}
