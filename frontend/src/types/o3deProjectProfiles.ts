export const O3DE_PROJECT_PROFILES_VERSION = 1 as const;
export const O3DE_PROJECT_PROFILES_STORAGE_KEY = "o3de_codex_vx001_project_profiles_v1";

export type O3DEProjectProfileKind = "canonical" | "saved" | "backend";

export type O3DEProjectProfile = {
  id: string;
  name: string;
  kind: O3DEProjectProfileKind;
  projectRoot: string;
  engineRoot: string;
  editorRunner: string;
  sourceLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type O3DEProjectProfilesStore = {
  version: typeof O3DE_PROJECT_PROFILES_VERSION;
  updatedAt: string;
  activeProfileId: string;
  profiles: O3DEProjectProfile[];
};
