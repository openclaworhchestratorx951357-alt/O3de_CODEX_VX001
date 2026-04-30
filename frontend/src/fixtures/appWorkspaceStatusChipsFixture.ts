export type WorkspaceStatusTaxonomy =
  | "admitted-real"
  | "proof-only"
  | "dry-run only"
  | "plan-only"
  | "demo"
  | "hold-default-off"
  | "blocked";

export type WorkspaceStatusChipRow = {
  workspace: string;
  capabilityWindow: string;
  taxonomy: WorkspaceStatusTaxonomy;
  summary: string;
  boundary: string;
  nextGate: string;
};

export const appWorkspaceStatusChipsFixtureGeneratedAt = "2026-04-30";

export const appWorkspaceStatusChipRows: readonly WorkspaceStatusChipRow[] = [
  {
    workspace: "Home review shells",
    capabilityWindow: "capability + audit + approval + evidence",
    taxonomy: "demo",
    summary: "Fixture-first dashboard shells improve operator truth visibility without changing backend admission.",
    boundary: "display-only",
    nextGate: "dashboard truth refresh + shared taxonomy alignment",
  },
  {
    workspace: "Validation intake endpoint candidate",
    capabilityWindow: "validation.report.intake",
    taxonomy: "hold-default-off",
    summary:
      "Server-owned gate states keep endpoint blocked by default; explicit_on still remains dry-run-only with write_status=blocked.",
    boundary: "no execution admission",
    nextGate: "long-hold maintenance unless explicit future admission is approved",
  },
  {
    workspace: "Editor authoring readback review lane",
    capabilityWindow: "editor.component.property.get",
    taxonomy: "admitted-real",
    summary:
      "Read-only editor property readback long-hold posture remains explicit while write/restore scope stays exact and narrow.",
    boundary: "read-only review only",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
  {
    workspace: "Settings inspect review lane",
    capabilityWindow: "settings.inspect (via project.inspect)",
    taxonomy: "admitted-real",
    summary:
      "Read-only settings inspection remains admitted through project.inspect include_settings with explicit requested/matched/missing settings evidence wording.",
    boundary: "read-only only",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
  {
    workspace: "Build configure preflight review lane",
    capabilityWindow: "build.configure.preflight",
    taxonomy: "admitted-real",
    summary:
      "Real configure preflight remains dry_run-only with plan/provenance evidence; configure command execution is still not admitted in this lane.",
    boundary: "no configure mutation or build execute admission",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
  {
    workspace: "Build execution long-hold lane",
    capabilityWindow: "build.execute.real",
    taxonomy: "admitted-real",
    summary:
      "Long-hold checkpoint keeps hold/no-go posture explicit for build.execute.real broadening while preserving named-target execution controls and timeout/log/result evidence boundaries.",
    boundary: "explicit named-target gated execution only",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
  {
    workspace: "Asset Forge stage write",
    capabilityWindow: "asset_forge.o3de.stage_write.v1",
    taxonomy: "proof-only",
    summary: "Exact proof corridor remains bounded by admission-flag and evidence gates.",
    boundary: "no broad mutation admission",
    nextGate: "admission-flag verification refresh",
  },
  {
    workspace: "Project config patch corridor",
    capabilityWindow: "settings.patch.narrow",
    taxonomy: "admitted-real",
    summary:
      "Narrow mutation path stays admitted only for explicit manifest-backed patch scope; rollback remains bounded by class identity, backup linkage, and post-rollback readback evidence expectations.",
    boundary: "exact corridor only",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
  {
    workspace: "Automation productization",
    capabilityWindow: "codex.flow.trigger.productized",
    taxonomy: "proof-only",
    summary:
      "Productization plan, audit-gate checklist, bounded productization design, security-review controls, operator-approval semantics, runtime-admission readiness audit, runtime-admission contract design, proof-only implementation, operator-examples checkpoint, release-readiness hold/no-go decision, and long-hold checkpoint are now documented; helper automation remains non-admitted.",
    boundary: "local helper only",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
  {
    workspace: "Editor broad mutation",
    capabilityWindow: "generic component/property writes",
    taxonomy: "blocked",
    summary: "Broad editor mutation remains blocked outside exact admitted corridors.",
    boundary: "no generic write corridor",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
  {
    workspace: "Placement execution",
    capabilityWindow: "asset_forge placement execute",
    taxonomy: "dry-run only",
    summary: "Placement planning and readiness stay dry-run-focused; execution remains unadmitted.",
    boundary: "no placement execution",
    nextGate: "Asset Forge placement proof-only admission-flag release-readiness decision",
  },
];
