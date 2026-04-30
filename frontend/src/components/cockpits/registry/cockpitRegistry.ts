import { cockpitDefinitions, cockpitNavSections } from "./cockpitDefinitions";
import type {
  CockpitCategory,
  CockpitDefinition,
  CockpitDefinitionValidation,
  CockpitId,
  CockpitPromptTemplate,
} from "./cockpitRegistryTypes";

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function validateCockpitDefinition(definition: CockpitDefinition): CockpitDefinitionValidation {
  const errors: string[] = [];

  if (!definition.id?.trim()) {
    errors.push("id is required");
  }
  if (!definition.title?.trim()) {
    errors.push(`${definition.id || "unknown"}: title is required`);
  }
  if (!definition.navLabel?.trim()) {
    errors.push(`${definition.id || "unknown"}: navLabel is required`);
  }
  if (!definition.routeKey?.trim()) {
    errors.push(`${definition.id || "unknown"}: routeKey is required`);
  }
  if (!definition.homeCard) {
    errors.push(`${definition.id || "unknown"}: homeCard is required`);
  }

  const panelIds = definition.panels.map((panel) => panel.id);
  if (unique(panelIds).length !== panelIds.length) {
    errors.push(`${definition.id}: panel ids must be unique`);
  }

  const stageIds = definition.pipeline.map((stage) => stage.id);
  if (unique(stageIds).length !== stageIds.length) {
    errors.push(`${definition.id}: pipeline stage ids must be unique`);
  }

  definition.commandBar.forEach((command) => {
    if (!command.truthState) {
      errors.push(`${definition.id}: command ${command.id} missing truthState`);
    }
  });

  definition.promptTemplates.forEach((template) => {
    if (template.autoExecute !== false) {
      errors.push(`${definition.id}: prompt template ${template.id} must set autoExecute=false`);
    }
  });

  definition.blockedCapabilities.forEach((capability) => {
    if (!capability.reason?.trim()) {
      errors.push(`${definition.id}: blocked capability ${capability.id} missing reason`);
    }
    if (!capability.nextUnlock?.trim()) {
      errors.push(`${definition.id}: blocked capability ${capability.id} missing nextUnlock`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getAllCockpitDefinitions(): CockpitDefinition[] {
  return [...cockpitDefinitions];
}

export function getCockpitDefinition(id: CockpitId): CockpitDefinition | undefined {
  return cockpitDefinitions.find((definition) => definition.id === id);
}

export function getCockpitsByCategory(category: CockpitCategory): CockpitDefinition[] {
  return cockpitDefinitions.filter((definition) => definition.category === category);
}

export function getHomeLaunchCockpits(): CockpitDefinition[] {
  return cockpitDefinitions.filter((definition) => definition.id !== "home");
}

export function getCockpitNavSections() {
  return cockpitNavSections.map((section) => ({
    ...section,
    cockpits: section.cockpitIds
      .map((id) => getCockpitDefinition(id))
      .filter((definition): definition is CockpitDefinition => Boolean(definition)),
  }));
}

export function getCockpitPromptTemplates(id: CockpitId): CockpitPromptTemplate[] {
  return getCockpitDefinition(id)?.promptTemplates ?? [];
}

export function validateCockpitRegistry(definitions: CockpitDefinition[] = cockpitDefinitions): CockpitDefinitionValidation {
  const errors: string[] = [];
  const ids = definitions.map((definition) => definition.id);
  if (unique(ids).length !== ids.length) {
    errors.push("cockpit ids must be unique");
  }

  definitions.forEach((definition) => {
    const validation = validateCockpitDefinition(definition);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
