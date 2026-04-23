import type {
  O3DEProjectProfile,
  O3DEProjectProfileKind,
  O3DEProjectProfilesStore,
} from "../types/o3deProjectProfiles";
import {
  O3DE_PROJECT_PROFILES_STORAGE_KEY,
  O3DE_PROJECT_PROFILES_VERSION,
} from "../types/o3deProjectProfiles";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type ProjectProfileInput = {
  id?: string;
  name: string;
  kind?: O3DEProjectProfileKind;
  projectRoot: string;
  engineRoot: string;
  editorRunner?: string;
  sourceLabel?: string;
};

export const MCP_SANDBOX_PROFILE_ID = "mcp-sandbox-canonical";

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn("O3DE project profile storage is unavailable.", error);
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function sanitizeProfileKind(value: unknown): O3DEProjectProfileKind {
  return value === "canonical" || value === "backend" || value === "saved" ? value : "saved";
}

function sanitizeProfileId(value: unknown, fallback: string): string {
  const candidate = sanitizeString(value);
  return /^[a-zA-Z0-9._-]+$/.test(candidate) ? candidate : fallback;
}

function createProfileId(name: string, timestamp = Date.now()): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `profile-${slug || "o3de-project"}-${timestamp}`;
}

export function createCanonicalMcpSandboxProfile(updatedAt = nowIso()): O3DEProjectProfile {
  return {
    id: MCP_SANDBOX_PROFILE_ID,
    name: "McpSandbox canonical target",
    kind: "canonical",
    projectRoot: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox",
    engineRoot: "C:\\src\\o3de",
    editorRunner: "C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox\\build\\windows\\bin\\profile\\Editor.exe",
    sourceLabel: "repo-canonical-local-target",
    createdAt: updatedAt,
    updatedAt,
  };
}

export function createO3DEProjectProfile(
  input: ProjectProfileInput,
  updatedAt = nowIso(),
): O3DEProjectProfile {
  const name = sanitizeString(input.name, "O3DE project");
  const id = sanitizeProfileId(input.id, createProfileId(name));

  return {
    id,
    name,
    kind: input.kind ?? "saved",
    projectRoot: sanitizeString(input.projectRoot),
    engineRoot: sanitizeString(input.engineRoot),
    editorRunner: sanitizeString(input.editorRunner),
    sourceLabel: sanitizeString(input.sourceLabel, "operator-saved-project-profile"),
    createdAt: updatedAt,
    updatedAt,
  };
}

export function createDefaultO3DEProjectProfilesStore(updatedAt = nowIso()): O3DEProjectProfilesStore {
  const canonicalProfile = createCanonicalMcpSandboxProfile(updatedAt);
  return {
    version: O3DE_PROJECT_PROFILES_VERSION,
    updatedAt,
    activeProfileId: canonicalProfile.id,
    profiles: [canonicalProfile],
  };
}

function normalizeProfile(rawProfile: unknown, index: number, updatedAt: string): O3DEProjectProfile | null {
  if (!isRecord(rawProfile)) {
    return null;
  }

  const name = sanitizeString(rawProfile.name);
  const projectRoot = sanitizeString(rawProfile.projectRoot);
  const engineRoot = sanitizeString(rawProfile.engineRoot);

  if (!name || !projectRoot || !engineRoot) {
    return null;
  }

  const id = sanitizeProfileId(rawProfile.id, createProfileId(name, index));
  const createdAt = sanitizeString(rawProfile.createdAt, updatedAt);

  return {
    id,
    name,
    kind: sanitizeProfileKind(rawProfile.kind),
    projectRoot,
    engineRoot,
    editorRunner: sanitizeString(rawProfile.editorRunner),
    sourceLabel: sanitizeString(rawProfile.sourceLabel, "operator-saved-project-profile"),
    createdAt,
    updatedAt: sanitizeString(rawProfile.updatedAt, updatedAt),
  };
}

export function migrateO3DEProjectProfilesStore(rawStore: unknown): O3DEProjectProfilesStore {
  const defaults = createDefaultO3DEProjectProfilesStore();
  if (!isRecord(rawStore)) {
    return defaults;
  }

  const updatedAt = sanitizeString(rawStore.updatedAt, nowIso());
  const rawProfiles = Array.isArray(rawStore.profiles) ? rawStore.profiles : [];
  const profileMap = new Map<string, O3DEProjectProfile>();

  profileMap.set(MCP_SANDBOX_PROFILE_ID, createCanonicalMcpSandboxProfile(updatedAt));
  rawProfiles.forEach((rawProfile, index) => {
    const normalizedProfile = normalizeProfile(rawProfile, index, updatedAt);
    if (normalizedProfile) {
      profileMap.set(normalizedProfile.id, normalizedProfile);
    }
  });

  const profiles = [...profileMap.values()];
  const requestedActiveProfileId = sanitizeString(rawStore.activeProfileId);
  const activeProfileId = profiles.some((profile) => profile.id === requestedActiveProfileId)
    ? requestedActiveProfileId
    : profiles[0]?.id ?? MCP_SANDBOX_PROFILE_ID;

  return {
    version: O3DE_PROJECT_PROFILES_VERSION,
    updatedAt,
    activeProfileId,
    profiles,
  };
}

export function loadO3DEProjectProfilesStore(
  storage: StorageLike | null = getStorage(),
): O3DEProjectProfilesStore {
  if (!storage) {
    return createDefaultO3DEProjectProfilesStore();
  }

  try {
    const rawValue = storage.getItem(O3DE_PROJECT_PROFILES_STORAGE_KEY);
    if (!rawValue) {
      return createDefaultO3DEProjectProfilesStore();
    }

    return migrateO3DEProjectProfilesStore(JSON.parse(rawValue));
  } catch (error) {
    console.warn("Failed to load O3DE project profiles. Falling back to defaults.", error);
    return createDefaultO3DEProjectProfilesStore();
  }
}

export function saveO3DEProjectProfilesStore(
  store: O3DEProjectProfilesStore,
  storage: StorageLike | null = getStorage(),
): O3DEProjectProfilesStore {
  const nextStore = migrateO3DEProjectProfilesStore({
    ...store,
    updatedAt: nowIso(),
  });

  if (!storage) {
    return nextStore;
  }

  try {
    storage.setItem(O3DE_PROJECT_PROFILES_STORAGE_KEY, JSON.stringify(nextStore));
  } catch (error) {
    console.warn("Failed to save O3DE project profiles.", error);
  }

  return nextStore;
}

export function upsertO3DEProjectProfile(
  store: O3DEProjectProfilesStore,
  profile: O3DEProjectProfile,
): O3DEProjectProfilesStore {
  const profiles = store.profiles.filter((candidate) => candidate.id !== profile.id);

  return {
    ...store,
    activeProfileId: profile.id,
    profiles: [...profiles, profile],
  };
}

export function selectO3DEProjectProfile(
  store: O3DEProjectProfilesStore,
  profileId: string,
): O3DEProjectProfilesStore {
  const activeProfileId = store.profiles.some((profile) => profile.id === profileId)
    ? profileId
    : store.activeProfileId;

  return {
    ...store,
    activeProfileId,
  };
}

export function getActiveO3DEProjectProfile(store: O3DEProjectProfilesStore): O3DEProjectProfile {
  return (
    store.profiles.find((profile) => profile.id === store.activeProfileId)
    ?? store.profiles[0]
    ?? createCanonicalMcpSandboxProfile()
  );
}
