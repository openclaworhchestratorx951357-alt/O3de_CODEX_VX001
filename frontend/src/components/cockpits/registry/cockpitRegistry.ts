import { cockpitDefinitions } from "./cockpitDefinitions";
import type {
  CockpitDefinition,
  CockpitId,
  CockpitNavSectionDefinition,
  CockpitCategory,
  CockpitPromptTemplate,
} from "./cockpitRegistryTypes";

const navSections: readonly CockpitNavSectionDefinition[] = [
  {
    id: "start",
    label: "Start",
    detail: "Orient first, then launch into focused cockpit environments.",
  },
  {
    id: "create",
    label: "Create",
    detail: "Author game/movie/project/asset flows with mission-first cockpit workflows.",
  },
  {
    id: "build",
    label: "Build",
    detail: "Plan prompts and coordinate implementation lanes.",
  },
  {
    id: "operate",
    label: "Operate",
    detail: "Coordinate dispatch, runtime posture, and operational flow.",
  },
  {
    id: "inspect",
    label: "Inspect",
    detail: "Review persisted evidence and timeline outcomes.",
  },
];

function buildDefinitionMap(definitions: readonly CockpitDefinition[]): Map<CockpitId, CockpitDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

const definitionMap = buildDefinitionMap(cockpitDefinitions);

export function validateCockpitDefinition(definition: CockpitDefinition): string[] {
  const issues: string[] = [];

  if (!definition.id?.trim()) {
    issues.push("missing id");
  }
  if (!definition.title?.trim()) {
    issues.push(`${definition.id}: missing title`);
  }
  if (!definition.navLabel?.trim()) {
    issues.push(`${definition.id}: missing navLabel`);
  }
  if (!definition.routeKey?.trim()) {
    issues.push(`${definition.id}: missing routeKey`);
  }
  if (!definition.homeCard) {
    issues.push(`${definition.id}: missing homeCard`);
  }

  for (const command of definition.commandBar) {
    if (!command.truthState?.trim()) {
      issues.push(`${definition.id}: command ${command.id} missing truthState`);
    }
  }
  for (const template of definition.promptTemplates) {
    if (template.autoExecute !== false) {
      issues.push(`${definition.id}: template ${template.id} autoExecute must be false`);
    }
  }

  const panelIds = new Set<string>();
  for (const panel of definition.panels) {
    if (panelIds.has(panel.id)) {
      issues.push(`${definition.id}: duplicate panel id ${panel.id}`);
    }
    panelIds.add(panel.id);
  }

  const pipelineIds = new Set<string>();
  for (const stage of definition.pipeline) {
    if (pipelineIds.has(stage.id)) {
      issues.push(`${definition.id}: duplicate pipeline stage id ${stage.id}`);
    }
    pipelineIds.add(stage.id);
  }

  for (const capability of definition.blockedCapabilities) {
    if (!capability.reason?.trim()) {
      issues.push(`${definition.id}: blocked capability ${capability.id} missing reason`);
    }
    if (!capability.nextUnlock?.trim()) {
      issues.push(`${definition.id}: blocked capability ${capability.id} missing nextUnlock`);
    }
  }

  return issues;
}

export function getCockpitRegistryValidationIssues(): string[] {
  const seenIds = new Set<string>();
  const issues: string[] = [];

  for (const definition of cockpitDefinitions) {
    if (seenIds.has(definition.id)) {
      issues.push(`duplicate cockpit id ${definition.id}`);
      continue;
    }
    seenIds.add(definition.id);
    issues.push(...validateCockpitDefinition(definition));
  }

  return issues;
}

export function getAllCockpitDefinitions(): readonly CockpitDefinition[] {
  return cockpitDefinitions;
}

export function getCockpitDefinition(id: CockpitId): CockpitDefinition | undefined {
  return definitionMap.get(id);
}

export function getCockpitsByCategory(category: CockpitCategory): readonly CockpitDefinition[] {
  return cockpitDefinitions.filter((definition) => definition.category === category);
}

export function getHomeLaunchCockpits(): readonly CockpitDefinition[] {
  return cockpitDefinitions.filter((definition) => definition.showInHomeLauncher);
}

export function getCockpitPromptTemplates(id: CockpitId): readonly CockpitPromptTemplate[] {
  return getCockpitDefinition(id)?.promptTemplates ?? [];
}

export function getCockpitNavSections(): Array<CockpitNavSectionDefinition & { items: CockpitDefinition[] }> {
  return navSections.map((section) => ({
    ...section,
    items: [...getCockpitsByCategory(section.id)],
  }));
}
