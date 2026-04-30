import type { CockpitDefinition } from "./cockpitRegistryTypes";

export function createCockpitDefinition(definition: CockpitDefinition): CockpitDefinition {
  return definition;
}

export function toCockpitSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
