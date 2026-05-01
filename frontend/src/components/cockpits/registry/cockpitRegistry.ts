import { cockpitDefinitions } from "./cockpitDefinitions";
import type {
  CockpitDefinition,
  CockpitId,
  CockpitNavSectionDefinition,
  CockpitCategory,
  CockpitPromptTemplate,
  CockpitUiActionId,
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

const promptLaunchActionIds = new Set<CockpitUiActionId>([
  "launch-inspect-template",
  "launch-create-entity-template",
  "launch-add-mesh-template",
  "launch-camera-template",
  "launch-placement-proof-template",
]);

export function isRegisteredCockpitId(id: string): id is CockpitId {
  return definitionMap.has(id as CockpitId);
}

export function getRegisteredCockpitIds(): CockpitId[] {
  return [...definitionMap.keys()];
}

export function validateCockpitDefinition(definition: CockpitDefinition): string[] {
  const issues: string[] = [];
  const templateIds = new Set(definition.promptTemplates.map((template) => template.id));

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
    if (!command.actionId?.trim()) {
      issues.push(`${definition.id}: command ${command.id} missing actionId`);
    }
    if (command.promptTemplateId && !templateIds.has(command.promptTemplateId)) {
      issues.push(
        `${definition.id}: command ${command.id} references missing prompt template ${command.promptTemplateId}`,
      );
    }
    if (command.actionId && promptLaunchActionIds.has(command.actionId) && !command.promptTemplateId) {
      issues.push(`${definition.id}: command ${command.id} launch action missing promptTemplateId`);
    }
  }
  for (const binding of definition.toolActionBindings) {
    if (binding.promptTemplateId && !templateIds.has(binding.promptTemplateId)) {
      issues.push(
        `${definition.id}: tool card ${binding.cardId} references missing prompt template ${binding.promptTemplateId}`,
      );
    }
    if (promptLaunchActionIds.has(binding.actionId)) {
      const commandTemplateId = definition.commandBar.find(
        (command) => command.actionId === binding.actionId,
      )?.promptTemplateId;
      if (!binding.promptTemplateId && !commandTemplateId) {
        issues.push(
          `${definition.id}: tool card ${binding.cardId} launch action missing promptTemplateId`,
        );
      }
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

export function getCockpitPromptTemplateIdForAction(
  cockpitId: CockpitId,
  actionId: CockpitUiActionId | undefined,
): string | undefined {
  if (!actionId) {
    return undefined;
  }
  return getCockpitDefinition(cockpitId)?.commandBar.find((command) => command.actionId === actionId)?.promptTemplateId;
}

export function getCockpitNavSections(): Array<CockpitNavSectionDefinition & { items: CockpitDefinition[] }> {
  return navSections.map((section) => ({
    ...section,
    items: [...getCockpitsByCategory(section.id)],
  }));
}
