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
