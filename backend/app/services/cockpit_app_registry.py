from app.models.cockpit_apps import (
    CockpitAppBlockedCapabilityRecord,
    CockpitAppRegistryRecord,
    CockpitAppRegistrationRecord,
)


def build_cockpit_app_registry() -> CockpitAppRegistryRecord:
    registrations = [
        CockpitAppRegistrationRecord(
            workspace_id="create-game",
            nav_label="Create Game",
            nav_subtitle="Open the Create Game cockpit environment",
            workspace_title="Create Game",
            workspace_subtitle=(
                "Create Game Cockpit with staged mission workflow, bounded editor actions, "
                "and evidence review."
            ),
            launch_title="Create Game Cockpit",
            detail="Build a game through staged concept, level, entity, component, and review steps.",
            truth_state="mission cockpit / narrow admitted editor actions + read-only support",
            blocked="Full game generation and broad mutation remain blocked.",
            next_safe_action="Open cockpit and start with inspect or a narrow admitted editor plan.",
            action_label="Open Create Game",
            shell_mode="dockable-cockpit",
            tone="success",
            help_tooltip=(
                "Open the first-class Create Game cockpit with mission pipeline, tools, "
                "and blocked-capability guidance."
            ),
        ),
        CockpitAppRegistrationRecord(
            workspace_id="create-movie",
            nav_label="Create Movie",
            nav_subtitle="Open the Create Movie cockpit environment",
            workspace_title="Create Movie",
            workspace_subtitle=(
                "Create Movie Cockpit with cinematic planning, proof-only placement review, "
                "and explicit blockers."
            ),
            launch_title="Create Movie Cockpit",
            detail="Plan cinematic shots, camera placeholders, and proof-only prop placement review.",
            truth_state="planning + narrow editor actions + proof-only placement",
            blocked="Render/export automation and placement writes remain blocked.",
            next_safe_action="Open cockpit and use proof-only templates before any future admission packet.",
            action_label="Open Create Movie",
            shell_mode="dockable-cockpit",
            tone="info",
            help_tooltip=(
                "Open the first-class Create Movie cockpit for cinematic pipeline, proof-only placement, "
                "and review guidance."
            ),
        ),
        CockpitAppRegistrationRecord(
            workspace_id="load-project",
            nav_label="Load Project",
            nav_subtitle="Open the Load Project cockpit environment",
            workspace_title="Load Project",
            workspace_subtitle=(
                "Load Project Cockpit for read-only target verification and preflight readiness checks."
            ),
            launch_title="Load Project Cockpit",
            detail="Verify active target, bridge status, and readiness before authoring prompts.",
            truth_state="read-only / configuration preflight",
            blocked="Project registration and project file writes are not admitted in this packet.",
            next_safe_action="Open cockpit and verify target checklist before continuing.",
            action_label="Open Load Project",
            shell_mode="dockable-cockpit",
            tone="neutral",
            help_tooltip=(
                "Open the first-class Load Project cockpit for target verification and configuration preflight."
            ),
        ),
        CockpitAppRegistrationRecord(
            workspace_id="asset-forge",
            nav_label="Asset Forge",
            nav_subtitle="Open the full-screen Blender-style Asset Forge editor",
            workspace_title="Asset Forge",
            workspace_subtitle=(
                "Full-screen Blender-style Asset Forge editor with backend model data, read-only "
                "evidence, and gated proof workflows."
            ),
            launch_title="Asset Forge",
            detail=(
                "Inspect and plan production asset candidates in a full-screen Blender-style "
                "cockpit/editor surface."
            ),
            truth_state="read-only / preflight-only / proof-only editor model",
            blocked=(
                "Provider generation, Blender execution, Asset Processor execution, placement writes, "
                "and material mutation remain blocked."
            ),
            next_safe_action=(
                "Open the editor, select tools or objects locally, and use prompt templates "
                "without auto-execution."
            ),
            action_label="Open Asset Forge",
            shell_mode="full-screen-editor",
            tone="info",
            help_tooltip=(
                "Open Asset Forge as its own full-screen production editor for backend-supported tool "
                "state, safety truth, and proof-only workflows."
            ),
        ),
    ]
    blocked_capabilities = [
        CockpitAppBlockedCapabilityRecord(
            capability_id="provider-generation",
            label="Provider generation",
            reason="External provider generation is not admitted in this packet.",
            next_unlock="Complete dedicated provider admission audit, tests, and explicit operator approval.",
        ),
        CockpitAppBlockedCapabilityRecord(
            capability_id="blender-execution",
            label="Blender execution",
            reason="Real Blender execution is intentionally blocked in this packet.",
            next_unlock="Complete bounded Blender execution corridor design and explicit admission gate.",
        ),
        CockpitAppBlockedCapabilityRecord(
            capability_id="asset-processor-execution",
            label="Asset Processor execution",
            reason="Asset Processor execution remains blocked for this cockpit contract packet.",
            next_unlock=(
                "Add explicit preflight/proof gates and admission checks before enabling processor execution."
            ),
        ),
        CockpitAppBlockedCapabilityRecord(
            capability_id="placement-write",
            label="Placement write",
            reason="Runtime placement writes are blocked until a dedicated placement admission packet lands.",
            next_unlock="Use proof-only placement templates and evidence review until placement admission is granted.",
        ),
        CockpitAppBlockedCapabilityRecord(
            capability_id="material-mutation",
            label="Material mutation",
            reason="Material mutation is blocked in cockpit flows for this packet.",
            next_unlock="Complete material mutation safety gates and explicit scoped admission decision.",
        ),
    ]
    return CockpitAppRegistryRecord(
        registrations=registrations,
        blocked_capabilities=blocked_capabilities,
        next_safe_action=(
            "Open Asset Forge as a full-screen editor cockpit and continue read-only, preflight-only, "
            "or proof-only workflows."
        ),
    )
