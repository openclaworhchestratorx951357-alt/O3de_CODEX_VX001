import { describe, expect, it } from "vitest";

import {
  buildCockpitAppRegistryByWorkspaceId,
  cockpitAppRegistry,
  cockpitWorkspaceIds,
  getCockpitAppRegistration,
  isCockpitWorkspaceId,
  resolveCockpitAppRegistry,
} from "./cockpitAppRegistry";

describe("cockpitAppRegistry", () => {
  it("registers the first-class cockpit workspaces with fail-closed safety flags", () => {
    expect(cockpitWorkspaceIds).toEqual([
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
    ]);

    const workspaceIds = cockpitAppRegistry.map((registration) => registration.workspaceId);
    expect(new Set(workspaceIds).size).toBe(workspaceIds.length);

    for (const registration of cockpitAppRegistry) {
      expect(registration.executionAdmitted).toBe(false);
      expect(registration.mutationAdmitted).toBe(false);
      expect(registration.providerGenerationAdmitted).toBe(false);
      expect(registration.blenderExecutionAdmitted).toBe(false);
      expect(registration.assetProcessorExecutionAdmitted).toBe(false);
      expect(registration.placementWriteAdmitted).toBe(false);
      expect(registration.nextSafeAction.length).toBeGreaterThan(20);
    }
  });

  it("marks Asset Forge as the full-screen editor cockpit without execution admission", () => {
    const assetForge = getCockpitAppRegistration("asset-forge");

    expect(assetForge.navLabel).toBe("Asset Forge");
    expect(assetForge.shellMode).toBe("full-screen-editor");
    expect(assetForge.workspaceSubtitle).toMatch(/Blender-style/i);
    expect(assetForge.truthState).toMatch(/proof-only|read-only|preflight/i);
    expect(assetForge.executionAdmitted).toBe(false);
    expect(assetForge.mutationAdmitted).toBe(false);
  });

  it("guards workspace id checks through the registry", () => {
    expect(isCockpitWorkspaceId("asset-forge")).toBe(true);
    expect(isCockpitWorkspaceId("prompt")).toBe(false);
    expect(isCockpitWorkspaceId(null)).toBe(false);
  });

  it("normalizes backend registry records and keeps fallback cards for missing entries", () => {
    const resolved = resolveCockpitAppRegistry({
      source: "cockpit-app-registry",
      inspection_surface: "read_only",
      registry_status: "available",
      execution_admitted: false,
      mutation_admitted: false,
      provider_generation_admitted: false,
      blender_execution_admitted: false,
      asset_processor_execution_admitted: false,
      placement_write_admitted: false,
      registrations: [
        {
          workspace_id: "asset-forge",
          nav_label: "Forge",
          nav_subtitle: "Backend subtitle",
          workspace_title: "Forge Title",
          workspace_subtitle: "Backend workspace subtitle",
          launch_title: "Forge Launch",
          detail: "Backend detail",
          truth_state: "read-only",
          blocked: "Blocked in backend",
          next_safe_action: "Backend next step",
          action_label: "Open Forge",
          shell_mode: "full-screen-editor",
          tone: "info",
          help_tooltip: "Backend tooltip",
          execution_admitted: false,
          mutation_admitted: false,
          provider_generation_admitted: false,
          blender_execution_admitted: false,
          asset_processor_execution_admitted: false,
          placement_write_admitted: false,
        },
      ],
      blocked_capabilities: [],
      next_safe_action: "Open a cockpit safely.",
    });

    expect(resolved).toHaveLength(4);
    expect(resolved[3]?.workspaceId).toBe("asset-forge");
    expect(resolved[3]?.navLabel).toBe("Forge");
    expect(resolved[0]?.workspaceId).toBe("create-game");
    expect(resolved[0]?.navLabel).toBe("Create Game");
    expect(resolved[0]?.executionAdmitted).toBe(false);
  });

  it("builds workspace lookup from a resolved registry", () => {
    const byWorkspaceId = buildCockpitAppRegistryByWorkspaceId(cockpitAppRegistry);

    expect(byWorkspaceId["create-game"].navLabel).toBe("Create Game");
    expect(byWorkspaceId["asset-forge"].shellMode).toBe("full-screen-editor");
  });
});
