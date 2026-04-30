import type { CockpitDefinition } from "./cockpitRegistryTypes";

type CockpitDefinitionInput = Omit<
  CockpitDefinition,
  "commandBar" | "toolActionBindings" | "pipeline" | "panels" | "promptTemplates" | "blockedCapabilities"
> & Partial<Pick<CockpitDefinition, "commandBar" | "toolActionBindings" | "pipeline" | "panels" | "promptTemplates" | "blockedCapabilities">>;

export function createCockpitDefinition(input: CockpitDefinitionInput): CockpitDefinition {
  return {
    ...input,
    commandBar: input.commandBar ?? [],
    toolActionBindings: input.toolActionBindings ?? [],
    pipeline: input.pipeline ?? [],
    panels: input.panels ?? [],
    promptTemplates: input.promptTemplates ?? [],
    blockedCapabilities: input.blockedCapabilities ?? [],
  };
}
