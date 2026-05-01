export type MissionPromptDraft = {
  id: string;
  label: string;
  promptText: string;
  preferredDomainsText: string;
  operatorNote: string;
  dryRun: boolean;
  truthLabels: string[];
  guidance: string;
};

export const inspectProjectMissionPromptDraft: MissionPromptDraft = {
  id: "inspect-project-read-only",
  label: "Inspect project evidence prompt",
  promptText: "Inspect the current O3DE project and summarize the target evidence, active level assumptions, available prompt capabilities, and safest next authoring step. Do not mutate content.",
  preferredDomainsText: "project-build",
  operatorNote: "Mission template handoff: read-only project inspection before mutation.",
  dryRun: true,
  truthLabels: [
    "read-only",
    "non-mutating",
    "preview-first",
  ],
  guidance: "Use this template to gather target truth first. Keep mutation blocked until admitted lanes are explicit and evidence-backed.",
};

export const createGameEntityMissionPromptDraft: MissionPromptDraft = {
  id: "create-game-safe-entity",
  label: "Create safe game entity prompt",
  promptText: "Open level \"Levels/DefaultLevel\" in the editor and create one root-level entity named \"GamePrototypeEntity\". Do not set parent_entity_id, prefab_asset, position, components, or properties.",
  preferredDomainsText: "editor-control",
  operatorNote: "Mission template handoff: narrow admitted-real entity create lane only.",
  dryRun: false,
  truthLabels: [
    "admitted-real narrow editor lane",
    "bounded mutation",
    "readback required",
  ],
  guidance: "Stay inside root-level named entity create boundaries. Do not add broad transforms, prefab mutation, or arbitrary component/property writes.",
};

export const addAllowlistedMeshMissionPromptDraft: MissionPromptDraft = {
  id: "add-allowlisted-mesh-component",
  label: "Add allowlisted Mesh component prompt",
  promptText: "Open the editor session, use the previous created entity if available, and add an allowlisted Mesh component. Return readback evidence.",
  preferredDomainsText: "editor-control",
  operatorNote: "Mission template handoff: allowlisted component lane only; no arbitrary component/property writes.",
  dryRun: false,
  truthLabels: [
    "admitted-real allowlisted lane",
    "bounded mutation",
    "readback required",
  ],
  guidance: "Only allowlisted component operations are admitted. Keep property-level mutation bounded and evidence-backed.",
};

export const inspectCinematicTargetMissionPromptDraft: MissionPromptDraft = {
  id: "inspect-cinematic-target-read-only",
  label: "Inspect cinematic target prompt",
  promptText: "Inspect the current O3DE project and summarize whether it is ready for a cinematic scene workflow. Do not mutate content.",
  preferredDomainsText: "project-build",
  operatorNote: "Mission template handoff: cinematic readiness inspection only.",
  dryRun: true,
  truthLabels: [
    "read-only",
    "non-mutating",
    "cinematic planning",
  ],
  guidance: "Use this template before scene/camera/prop authoring so cinematic assumptions are explicit and reviewable.",
};

export const createCinematicCameraPlaceholderMissionPromptDraft: MissionPromptDraft = {
  id: "create-cinematic-camera-placeholder",
  label: "Create cinematic camera placeholder prompt",
  promptText: "Open level \"Levels/DefaultLevel\" in the editor and create one root-level entity named \"CinematicCameraPlaceholder\". Do not set parent_entity_id, prefab_asset, position, components, or properties.",
  preferredDomainsText: "editor-control",
  operatorNote: "Mission template handoff: narrow admitted-real camera placeholder lane.",
  dryRun: false,
  truthLabels: [
    "admitted-real narrow editor lane",
    "bounded mutation",
    "camera placeholder only",
  ],
  guidance: "This template should create a placeholder only. Broad camera animation and scene rewrites remain blocked.",
};

export const cinematicPlacementProofOnlyMissionPromptDraft: MissionPromptDraft = {
  id: "cinematic-placement-proof-only-candidate",
  label: "Cinematic placement proof-only candidate prompt",
  promptText: "In the editor, create a placement proof-only candidate with candidate_id \"candidate-a\", candidate_label \"Weathered Ivy Arch\", staged_source_relative_path \"Assets/Generated/asset_forge/candidate_a/candidate_a.glb\", target_level_relative_path \"Levels/BridgeLevel01/BridgeLevel01.prefab\", target_entity_name \"CinematicPropCandidateA\", target_component \"Mesh\", stage_write_evidence_reference \"packet-10/stage-write-evidence.json\", stage_write_readback_reference \"packet-10/readback-evidence.json\", stage_write_readback_status \"succeeded\", approval_state \"approved\", and approval_note \"bounded proof-only cinematic prop review\".",
  preferredDomainsText: "editor-control",
  operatorNote: "Mission template handoff: cinematic placement proof-only request, fail-closed, non-mutating, and execution/write non-admitted.",
  dryRun: false,
  truthLabels: [
    "proof-only",
    "fail-closed",
    "non-mutating",
    "real placement not admitted",
  ],
  guidance: "Current outcomes must remain execution_admitted=false, placement_write_admitted=false, and mutation_occurred=false. Real placement needs a separate exact admission corridor with readback and revert/restore proof.",
};

export const inspectLoadProjectMissionPromptDraft: MissionPromptDraft = {
  id: "inspect-load-project-target",
  label: "Load project inspection prompt",
  promptText: "Inspect the current O3DE project and summarize the project evidence, engine root, active target assumptions, prompt capability readiness, and safest next authoring step. Do not mutate content.",
  preferredDomainsText: "project-build",
  operatorNote: "Mission template handoff: load-project cockpit read-only target verification.",
  dryRun: true,
  truthLabels: [
    "read-only",
    "no project file writes",
    "preflight target verification",
  ],
  guidance: "Keep target validation read-only in this cockpit. Register/create project and Gem mutation remain blocked until separate admission packets exist.",
};

export const placementProofOnlyMissionPromptDraft: MissionPromptDraft = {
  id: "placement-proof-only-candidate",
  label: "Placement proof-only candidate prompt",
  promptText: "In the editor, create a placement proof-only candidate with candidate_id \"candidate-a\", candidate_label \"Weathered Ivy Arch\", staged_source_relative_path \"Assets/Generated/asset_forge/candidate_a/candidate_a.glb\", target_level_relative_path \"Levels/BridgeLevel01/BridgeLevel01.prefab\", target_entity_name \"AssetForgeCandidateA\", target_component \"Mesh\", stage_write_evidence_reference \"packet-10/stage-write-evidence.json\", stage_write_readback_reference \"packet-10/readback-evidence.json\", stage_write_readback_status \"succeeded\", approval_state \"approved\", and approval_note \"bounded proof-only review\".",
  preferredDomainsText: "editor-control",
  operatorNote: "Mission template handoff: placement proof-only request, fail-closed, non-mutating, and execution/write non-admitted.",
  dryRun: false,
  truthLabels: [
    "proof-only",
    "fail-closed",
    "non-mutating",
    "real placement not admitted",
  ],
  guidance: "Current outcomes must remain execution_admitted=false, placement_write_admitted=false, and mutation_occurred=false. Real placement needs a separate exact admission corridor with readback and revert/restore proof.",
};
