import { describe, expect, it } from "vitest";

import {
  cockpitAppRegistry,
  cockpitWorkspaceIds,
  getCockpitAppRegistration,
  isCockpitWorkspaceId,
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
});
