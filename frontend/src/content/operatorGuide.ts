import rawCatalog from "./operatorGuideCatalog.json";

export type OperatorGuideApp = {
  title: string;
  subtitle: string;
  summary: string;
  tooltipGuidance: string;
  operatorFlow: string[];
  canonicalBackend: string;
  admittedRealTools: string[];
  simulatedOnlyFocusTools: string[];
  truthNotes: string[];
  maintenance: string[];
};

export type OperatorGuideQuickStat = {
  id: string;
  label: string;
  tooltip: string;
};

export type OperatorGuideProofCheck = {
  id: string;
  title: string;
  summary: string;
  endpoints: string[];
  commands: string[];
  evidence: string[];
};

export type OperatorGuidePanelControl = {
  id: string;
  label: string;
  tooltip: string;
};

export type OperatorGuidePanel = {
  id: string;
  title: string;
  locationLabel: string;
  tooltip: string;
  checklist: string[];
  controls: OperatorGuidePanelControl[];
};

export type OperatorGuideLaunchpad = {
  label: string;
  description: string;
  tooltip: string;
};

export type OperatorGuideWindow = {
  id: string;
  title: string;
  subtitle: string;
  tooltip: string;
  instructions: string[];
};

export type OperatorGuideSurface = {
  id: string;
  label: string;
  detail: string;
  tooltip: string;
  instructions: string[];
};

export type OperatorGuideWorkspace = {
  id: string;
  navLabel: string;
  navSubtitle: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  tooltip: string;
  guideSummary: string;
  operatorChecklist: string[];
  launchpad?: OperatorGuideLaunchpad;
  windows: OperatorGuideWindow[];
  surfaces?: OperatorGuideSurface[];
};

export type OperatorGuideCatalog = {
  app: OperatorGuideApp;
  quickStats: OperatorGuideQuickStat[];
  proofChecklist: OperatorGuideProofCheck[];
  panels: OperatorGuidePanel[];
  workspaces: OperatorGuideWorkspace[];
};

export const operatorGuideCatalog = rawCatalog as OperatorGuideCatalog;

const workspaceGuideById = new Map(
  operatorGuideCatalog.workspaces.map((workspace) => [workspace.id, workspace]),
);

const quickStatGuideById = new Map(
  operatorGuideCatalog.quickStats.map((quickStat) => [quickStat.id, quickStat]),
);

const panelGuideById = new Map(
  operatorGuideCatalog.panels.map((panel) => [panel.id, panel]),
);

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export function getWorkspaceGuide(workspaceId: string): OperatorGuideWorkspace {
  return requireValue(
    workspaceGuideById.get(workspaceId),
    `Missing operator guide workspace entry for "${workspaceId}".`,
  );
}

export function getWorkspaceWindowGuide(
  workspaceId: string,
  windowId: string,
): OperatorGuideWindow {
  const workspace = getWorkspaceGuide(workspaceId);

  return requireValue(
    workspace.windows.find((window) => window.id === windowId),
    `Missing operator guide window entry for "${workspaceId}.${windowId}".`,
  );
}

export function getWorkspaceSurfaceGuide(
  workspaceId: string,
  surfaceId: string,
): OperatorGuideSurface {
  const workspace = getWorkspaceGuide(workspaceId);

  return requireValue(
    workspace.surfaces?.find((surface) => surface.id === surfaceId),
    `Missing operator guide surface entry for "${workspaceId}.${surfaceId}".`,
  );
}

export function getQuickStatGuide(quickStatId: string): OperatorGuideQuickStat {
  return requireValue(
    quickStatGuideById.get(quickStatId),
    `Missing operator guide quick-stat entry for "${quickStatId}".`,
  );
}

export function getPanelGuide(panelId: string): OperatorGuidePanel {
  return requireValue(
    panelGuideById.get(panelId),
    `Missing operator guide panel entry for "${panelId}".`,
  );
}

export function getPanelControlGuide(
  panelId: string,
  controlId: string,
): OperatorGuidePanelControl {
  const panel = getPanelGuide(panelId);

  return requireValue(
    panel.controls.find((control) => control.id === controlId),
    `Missing operator guide panel control entry for "${panelId}.${controlId}".`,
  );
}

export function mergeGuideChecklists(
  ...checklists: ReadonlyArray<readonly string[] | undefined>
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const checklist of checklists) {
    for (const item of checklist ?? []) {
      const normalizedItem = item.trim();

      if (!normalizedItem || seen.has(normalizedItem)) {
        continue;
      }

      seen.add(normalizedItem);
      merged.push(normalizedItem);
    }
  }

  return merged;
}
