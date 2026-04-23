import { useState, type ChangeEvent, type CSSProperties } from "react";

import { createPromptShortcuts } from "../lib/api";
import type { PromptShortcutOption } from "../types/contracts";

export type O3DEProductionMode = "game" | "cinematic";

type ProductionStage = {
  id: string;
  label: string;
  outcome: string;
  prompt: string;
  evidence: string;
  avoid: string;
};

type ProductionSubGenre = {
  id: string;
  label: string;
  description: string;
  promptLead: string;
};

type ProductionScenario = {
  id: string;
  label: string;
  description: string;
  subGenres?: ProductionSubGenre[];
  stages: ProductionStage[];
};

type O3DEProductionPlannerProps = {
  mode: O3DEProductionMode;
  viewportLabel: string;
  activeToolLabel: string;
  projectProfileName?: string | null;
  onOpenPromptStudio?: () => void;
  onOpenBuilder?: () => void;
};

type WorkFocus = {
  id: string;
  label: string;
  detail: string;
  promptLead: string;
};

type SourceMode = "paste" | "file";

const SOURCE_CONTEXT_CHAR_LIMIT = 6000;
const SOURCE_CONTEXT_PROMPT_LIMIT = 800;
const LOCAL_SHORTCUT_STATUS =
  "Local quick prompts are ready. Refresh backend shortcuts when the live backend is running.";

const workFocuses: WorkFocus[] = [
  {
    id: "plan",
    label: "Plan the step",
    detail: "Use this before making editor changes.",
    promptLead: "Create a safe implementation plan for this step before touching O3DE.",
  },
  {
    id: "viewport",
    label: "Use current viewport",
    detail: "Use the visible app/O3DE context to shape the next command.",
    promptLead: "Use the current viewport context and selected tool area to guide the next admitted editor command.",
  },
  {
    id: "validate",
    label: "Validate evidence",
    detail: "Use this after changes or before promoting work.",
    promptLead: "Validate the current step with Records, Runtime, bridge evidence, and known acceptance checks.",
  },
];

const gameScenarios: ProductionScenario[] = [
  {
    id: "first-person-adventure",
    label: "First-person adventure",
    description: "Use this for exploration, interactables, traversal, readable spaces, and a strong player loop.",
    subGenres: [
      {
        id: "narrative-mystery",
        label: "Narrative mystery",
        description: "Story-first exploration, readable clues, and guided environmental payoff.",
        promptLead: "Keep the moment-to-moment loop centered on mystery discovery, clue payoff, and story pacing.",
      },
      {
        id: "immersive-sim",
        label: "Immersive sim",
        description: "Multiple solutions, systemic interactions, and layered world rules.",
        promptLead: "Bias recommendations toward systemic affordances, alternate solutions, and readable simulation rules.",
      },
      {
        id: "survival-exploration",
        label: "Survival exploration",
        description: "Resource pressure, atmosphere, and route planning through dangerous spaces.",
        promptLead: "Emphasize atmosphere, limited resources, and route-planning tension in the first playable slice.",
      },
    ],
    stages: [
      {
        id: "brief",
        label: "Game brief",
        outcome: "Lock the player promise, camera, controls, core loop, target platform, and production risks.",
        prompt: "Create a one-page first-person adventure brief with core loop, target player, scope limits, and first playable milestone.",
        evidence: "Saved brief, mission-control task, selected O3DE project profile, and Runtime readiness.",
        avoid: "Do not start broad art production before the player loop and level scale are proven.",
      },
      {
        id: "prototype",
        label: "Playable prototype",
        outcome: "Graybox one room, one objective, one interaction, and one restartable play loop.",
        prompt: "Plan the first playable graybox for a first-person room with one interactable objective and acceptance checks.",
        evidence: "Prompt plan, bridge-backed level/entity evidence when admitted tools are used, and manual play notes.",
        avoid: "Do not add complex inventories, AI, or save systems until the loop is fun and measurable.",
      },
      {
        id: "vertical-slice",
        label: "Vertical slice",
        outcome: "Finish one representative slice with placeholder UI, audio notes, lighting direction, and test criteria.",
        prompt: "Turn the prototype into a vertical-slice backlog with level, UI, audio, lighting, and validation tasks.",
        evidence: "Builder tasks, Records artifacts, bridge provenance, and a replayable validation checklist.",
        avoid: "Do not expand to many levels before one slice proves quality, timing, and performance.",
      },
      {
        id: "production",
        label: "Content production",
        outcome: "Split art, audio, gameplay, levels, build, and QA into owned lanes with clear definitions of done.",
        prompt: "Create a production lane plan for first-person adventure content with naming rules, validation gates, and weekly milestones.",
        evidence: "Mission-control ownership, source-control commits, asset checklist, and recurring build/test results.",
        avoid: "Do not let natural-language changes bypass review, approvals, or source-control preservation.",
      },
      {
        id: "release",
        label: "Release readiness",
        outcome: "Stabilize packaging, performance, input, settings, crash recovery, and operator runbooks.",
        prompt: "Create a release-readiness checklist for the first-person adventure slice with performance, packaging, and QA gates.",
        evidence: "Passing test/build logs, packaged build smoke test, known-issues list, and rollback notes.",
        avoid: "Do not call it production-ready until install, launch, play, save/quit, and recovery paths are verified.",
      },
    ],
  },
  {
    id: "puzzle-exploration",
    label: "Puzzle exploration",
    description: "Use this for room-by-room logic, readable goals, object interaction, clues, and validation-heavy playtests.",
    subGenres: [
      {
        id: "escape-room",
        label: "Escape room",
        description: "Contained spaces, chained clues, and strong reset/readability requirements.",
        promptLead: "Favor tightly scoped rooms, explicit reset behavior, and clear clue chaining.",
      },
      {
        id: "metroidbrainia",
        label: "Metroidbrainia",
        description: "Knowledge-gated progression with revisits, unlocks, and aha moments.",
        promptLead: "Favor knowledge-gated progression, revisits, and puzzle dependencies that reward player understanding.",
      },
      {
        id: "atmospheric-logic",
        label: "Atmospheric logic",
        description: "Mood-heavy puzzles where presentation supports comprehension and pacing.",
        promptLead: "Favor mood, visual readability, and puzzle pacing that supports comprehension without explicit tutorials.",
      },
    ],
    stages: [
      {
        id: "brief",
        label: "Puzzle promise",
        outcome: "Define the puzzle rule set, player vocabulary, clue style, fail states, and hint philosophy.",
        prompt: "Create a puzzle exploration brief with rules, clue language, level flow, and first puzzle acceptance tests.",
        evidence: "Puzzle design brief, testable rules, and mission task for the first room.",
        avoid: "Do not build many puzzle rooms before one rule set is understandable without explanation.",
      },
      {
        id: "prototype",
        label: "Test room",
        outcome: "Build one graybox puzzle room with entry, clue, interaction, success state, and reset path.",
        prompt: "Plan a single O3DE puzzle test room with named entities, interaction points, and reset/solve checks.",
        evidence: "Entity/component evidence, puzzle acceptance tests, and playtest observations.",
        avoid: "Do not add narrative branches until the base puzzle can be solved reliably.",
      },
      {
        id: "vertical-slice",
        label: "Puzzle slice",
        outcome: "Complete a short chain of puzzles with onboarding, escalation, payoff, and usability notes.",
        prompt: "Create a vertical-slice task plan for three linked puzzle rooms with onboarding and validation gates.",
        evidence: "Room-by-room task ownership, playtest notes, issue list, and Records artifacts.",
        avoid: "Do not tune visual polish before puzzle comprehension and reset behavior are verified.",
      },
      {
        id: "production",
        label: "Puzzle production",
        outcome: "Scale content using reusable puzzle patterns, naming conventions, and regression checks.",
        prompt: "Create a puzzle production checklist with reusable room patterns, asset naming, and regression tests.",
        evidence: "Reusable templates, regression checklist, task assignments, and source-control commits.",
        avoid: "Do not duplicate one-off puzzle logic without documenting how it is tested.",
      },
      {
        id: "release",
        label: "Release readiness",
        outcome: "Verify every puzzle can be completed, reset, and understood by a fresh player.",
        prompt: "Create a release validation plan for puzzle completion, hint clarity, reset behavior, and accessibility.",
        evidence: "Playthrough checklist, blocker list, accessibility notes, and packaged build smoke result.",
        avoid: "Do not ship if any puzzle can soft-lock or lacks a recovery path.",
      },
    ],
  },
  {
    id: "third-person-action",
    label: "Third-person action",
    description: "Use this for camera, movement feel, combat arenas, readable targets, and repeated encounter testing.",
    subGenres: [
      {
        id: "character-action",
        label: "Character action",
        description: "Expressive movement, stylish combat beats, and encounter readability.",
        promptLead: "Prioritize responsive movement, expressive combat pacing, and highly readable encounter framing.",
      },
      {
        id: "stealth-action",
        label: "Stealth action",
        description: "Sightlines, patrol spaces, layered affordances, and recovery states.",
        promptLead: "Prioritize stealth readability, patrol space design, detection recovery, and layered affordances.",
      },
      {
        id: "action-rpg",
        label: "Action RPG",
        description: "Ability progression, combat loops, and authored exploration with build identity.",
        promptLead: "Favor ability progression hooks, authored combat loops, and build identity without widening scope too early.",
      },
    ],
    stages: [
      {
        id: "brief",
        label: "Action brief",
        outcome: "Define camera distance, movement feel, enemy/target model, arena size, and input priorities.",
        prompt: "Create a third-person action brief with camera rules, movement goals, arena constraints, and first playable target.",
        evidence: "Brief, input assumptions, camera risk list, and mission-control task.",
        avoid: "Do not start full combat systems until camera and movement are comfortable.",
      },
      {
        id: "prototype",
        label: "Movement arena",
        outcome: "Graybox one arena with traversal, target markers, camera checks, and reset behavior.",
        prompt: "Plan a graybox third-person movement arena with target markers, camera checks, and validation notes.",
        evidence: "Level/entity plan, playtest notes, bridge evidence for admitted edits, and camera checklist.",
        avoid: "Do not add heavy VFX or enemy complexity until movement and readability pass.",
      },
      {
        id: "vertical-slice",
        label: "Encounter slice",
        outcome: "Build one representative encounter with readable pacing, placeholders, UI cues, and performance target.",
        prompt: "Create a vertical-slice backlog for one third-person encounter with readability, UI, audio, and performance gates.",
        evidence: "Task ownership, Records evidence, performance notes, and known issue list.",
        avoid: "Do not multiply enemies, arenas, or abilities before one encounter is stable.",
      },
      {
        id: "production",
        label: "Encounter production",
        outcome: "Scale arenas, abilities, content, and QA using lane ownership and regression playthroughs.",
        prompt: "Create a production lane plan for third-person action content with encounter templates and regression checks.",
        evidence: "Encounter templates, build/test logs, source-control commits, and QA pass/fail notes.",
        avoid: "Do not merge action tuning without repeatable test notes.",
      },
      {
        id: "release",
        label: "Release readiness",
        outcome: "Verify performance, controller input, camera comfort, failure recovery, and packaging.",
        prompt: "Create a release checklist for third-person camera comfort, input, performance, packaging, and crash recovery.",
        evidence: "Packaged smoke test, performance capture, input checklist, and rollback notes.",
        avoid: "Do not claim production-ready if camera/input regressions are unresolved.",
      },
    ],
  },
  {
    id: "multiplayer-prototype",
    label: "Multiplayer prototype",
    description: "Use this for network-risk discovery, replication plans, tiny test maps, and staged technical validation.",
    subGenres: [
      {
        id: "co-op-mission",
        label: "Co-op mission",
        description: "Shared objectives, role clarity, and revive/failure recovery checks.",
        promptLead: "Focus the slice on co-op objectives, team readability, and recovery when one player fails or disconnects.",
      },
      {
        id: "extraction-loop",
        label: "Extraction loop",
        description: "Enter-loot-extract tension, persistence risk, and recoverable failures.",
        promptLead: "Bias the prototype toward enter-loot-extract tension, recoverable failures, and deterministic session cleanup.",
      },
      {
        id: "arena-skirmish",
        label: "Arena skirmish",
        description: "Fast joins, tight arenas, repeated sync checks, and visible match state.",
        promptLead: "Bias recommendations toward fast joins, repeated match-state validation, and tightly scoped arenas.",
      },
    ],
    stages: [
      {
        id: "brief",
        label: "Network brief",
        outcome: "Define session model, player count, authority model, replication risks, and non-network fallback.",
        prompt: "Create a multiplayer prototype brief with player count, authority model, replication risks, and first test milestone.",
        evidence: "Network-risk register, architecture assumptions, and test plan task.",
        avoid: "Do not build content-heavy maps before the network model is proven.",
      },
      {
        id: "prototype",
        label: "Tiny network test",
        outcome: "Plan a tiny map, one replicated entity, one player action, and a deterministic test checklist.",
        prompt: "Create a tiny O3DE multiplayer test plan with one replicated object, one action, and pass/fail checks.",
        evidence: "Test map task, runbook, logs, and explicit pass/fail criteria.",
        avoid: "Do not add matchmaking, cosmetics, or progression before replication basics pass.",
      },
      {
        id: "vertical-slice",
        label: "Network slice",
        outcome: "Prove join, leave, action sync, desync recovery, and one gameplay objective.",
        prompt: "Create a vertical-slice backlog for a multiplayer objective with join/leave, sync, and recovery checks.",
        evidence: "Session test notes, logs, task ownership, and known network blockers.",
        avoid: "Do not scale player count until the smallest slice remains stable.",
      },
      {
        id: "production",
        label: "Network production",
        outcome: "Separate gameplay, backend, content, QA, and load-test lanes with strict validation.",
        prompt: "Create a multiplayer production lane plan with replication checks, load-test milestones, and rollback criteria.",
        evidence: "Load-test logs, regression runs, source-control commits, and issue triage.",
        avoid: "Do not accept natural-language network changes without deterministic tests.",
      },
      {
        id: "release",
        label: "Release readiness",
        outcome: "Verify reconnect, latency handling, crash recovery, packaging, and support runbooks.",
        prompt: "Create a multiplayer release checklist for latency, reconnect, crash recovery, packaging, and support.",
        evidence: "Network smoke tests, packaged build, incident plan, and rollback path.",
        avoid: "Do not ship if join/leave, reconnect, or desync recovery is unproven.",
      },
    ],
  },
  {
    id: "open-world",
    label: "Open world",
    description: "Use this for traversal scale, biome slices, systemic encounters, streaming risks, and world-level production lanes.",
    subGenres: [
      {
        id: "survival-crafting",
        label: "Survival crafting",
        description: "Resource gathering, route planning, shelter loops, and biome pressure.",
        promptLead: "Emphasize survival pressure, crafting progression, and biome-to-biome route planning in the first slice.",
      },
      {
        id: "open-world-rpg",
        label: "Open-world RPG",
        description: "Quest hubs, progression, authored encounters, and systemic travel.",
        promptLead: "Emphasize quest scaffolding, authored encounter loops, progression, and world readability for long sessions.",
      },
      {
        id: "sandbox-systems",
        label: "Sandbox systems",
        description: "Emergent systems, player-created goals, and tool-driven experimentation.",
        promptLead: "Emphasize systemic interactions, player-driven goals, and flexible world rules that create emergent play.",
      },
    ],
    stages: [
      {
        id: "brief",
        label: "World brief",
        outcome: "Define traversal fantasy, world scale, biome count, systemic pillars, and performance/streaming risks.",
        prompt: "Create an open-world game brief with traversal fantasy, biome plan, world rules, streaming risks, and first playable milestone.",
        evidence: "World brief, biome map sketch, risk register, and a named first-slice objective.",
        avoid: "Do not promise a giant map before one traversal loop and one biome slice are proven.",
      },
      {
        id: "prototype",
        label: "Traversal slice",
        outcome: "Graybox one traversal corridor, one point of interest, one encounter, and one recoverable return path.",
        prompt: "Plan a graybox open-world traversal slice with one point of interest, one encounter, and streaming/performance checks.",
        evidence: "Graybox objective, traversal notes, validation checklist, and bridge-backed editing evidence when admitted tools are used.",
        avoid: "Do not build many biomes or quest lines before traversal and scale feel right.",
      },
      {
        id: "vertical-slice",
        label: "Biome slice",
        outcome: "Finish one representative biome loop with traversal, encounter, objective, reward, and performance target.",
        prompt: "Create a vertical-slice backlog for one open-world biome with traversal, encounter, objective, and performance gates.",
        evidence: "Biome-slice tasks, world validation notes, Records artifacts, and known-risk list.",
        avoid: "Do not widen the world map before one biome proves quality, pacing, and streaming stability.",
      },
      {
        id: "production",
        label: "World production",
        outcome: "Split world composition, quest/content, traversal, streaming, build, and QA into trackable lanes.",
        prompt: "Create an open-world production lane plan with biome ownership, quest lanes, streaming checks, and weekly milestones.",
        evidence: "Lane ownership, source-control commits, world checklist, and recurring validation runs.",
        avoid: "Do not let natural-language world changes bypass ownership, review, or rollback notes.",
      },
      {
        id: "release",
        label: "Release readiness",
        outcome: "Verify traversal, streaming, spawn safety, save/load recovery, packaging, and support runbooks.",
        prompt: "Create an open-world release checklist for traversal, streaming, save/load recovery, packaging, and QA gates.",
        evidence: "Packaged smoke tests, performance captures, world-state recovery notes, and rollback path.",
        avoid: "Do not call the slice ready if travel, save/load, or streaming recovery is unproven.",
      },
    ],
  },
];

const cinematicScenarios: ProductionScenario[] = [
  {
    id: "trailer-previs",
    label: "Trailer / previs",
    description: "Use this for fast camera blocking, shot intent, timing, and production-risk discovery.",
    stages: [
      {
        id: "brief",
        label: "Creative brief",
        outcome: "Define audience, mood, runtime, shot count, hero moment, and review cadence.",
        prompt: "Create a trailer previs brief with mood, runtime, shot list, hero moment, and review gates.",
        evidence: "Creative brief, shot list, and mission-control tasks.",
        avoid: "Do not polish lighting before shot order and timing are approved.",
      },
      {
        id: "layout",
        label: "Layout pass",
        outcome: "Block camera positions, scene beats, rough timing, and object placement.",
        prompt: "Plan an O3DE layout pass for the trailer with camera beats, placeholders, and validation notes.",
        evidence: "Level/session readiness, shot tasks, and review notes.",
        avoid: "Do not start final materials or animation before layout review.",
      },
      {
        id: "slice",
        label: "Shot slice",
        outcome: "Finish one representative shot with camera, lighting direction, placeholder audio, and review criteria.",
        prompt: "Create a shot-slice task list for one trailer shot with camera, lighting, timing, and review criteria.",
        evidence: "Shot review, Records artifacts, and approved revision notes.",
        avoid: "Do not expand every shot before one shot proves the visual target.",
      },
      {
        id: "production",
        label: "Shot production",
        outcome: "Scale shots with naming rules, review status, render notes, and task ownership.",
        prompt: "Create a shot production tracker with shot status, owners, render checks, and naming rules.",
        evidence: "Shot tracker, task ownership, render notes, and source-control commits.",
        avoid: "Do not allow untracked scene changes outside the review path.",
      },
      {
        id: "release",
        label: "Final delivery",
        outcome: "Verify render settings, edit timing, audio handoff, archive, and rollback notes.",
        prompt: "Create a final delivery checklist for trailer render settings, timing, audio, archive, and rollback.",
        evidence: "Final render notes, delivery checklist, archive path, and known-issues list.",
        avoid: "Do not call final until the exported review artifact is checked end to end.",
      },
    ],
  },
  {
    id: "short-film",
    label: "Short film",
    description: "Use this for scene-by-scene planning, blocking, lookdev, animation, and final review discipline.",
    stages: [
      {
        id: "brief",
        label: "Story package",
        outcome: "Lock story beats, scene list, character needs, tone, and production constraints.",
        prompt: "Create a short-film story package with scene list, tone, character needs, and production constraints.",
        evidence: "Story package, scene list, and approval notes.",
        avoid: "Do not build detailed sets before story beats and scope are stable.",
      },
      {
        id: "layout",
        label: "Scene layout",
        outcome: "Block each scene with camera intent, timing, staging, and placeholder assets.",
        prompt: "Plan scene layout tasks for a short film with camera intent, staging, and placeholder asset needs.",
        evidence: "Scene tasks, layout notes, and bridge evidence for admitted editor changes.",
        avoid: "Do not animate final beats before staging and timing are reviewed.",
      },
      {
        id: "slice",
        label: "Lookdev scene",
        outcome: "Finish one representative scene with style, lighting, animation target, and render check.",
        prompt: "Create a lookdev scene backlog with lighting, camera, animation target, render check, and review gate.",
        evidence: "Lookdev notes, review artifact, and source-control commit.",
        avoid: "Do not propagate style choices until one scene is approved.",
      },
      {
        id: "production",
        label: "Scene production",
        outcome: "Run scenes through layout, animation, lighting, review, fixes, and archive lanes.",
        prompt: "Create a short-film production tracker with scene stages, owners, review dates, and archive rules.",
        evidence: "Production tracker, review notes, render artifacts, and issue list.",
        avoid: "Do not let scene changes skip review or naming conventions.",
      },
      {
        id: "release",
        label: "Delivery package",
        outcome: "Verify final exports, audio timing, credits, archive, source backup, and known issues.",
        prompt: "Create a delivery checklist for final short-film export, audio timing, credits, archive, and backup.",
        evidence: "Final render, archive proof, backup location, and signoff notes.",
        avoid: "Do not delete intermediate scene states until the archive is verified.",
      },
    ],
  },
];

function summarizeSourceContext(sourceContext: string, sourceName: string): string {
  const cleaned = sourceContext.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  const excerpt = cleaned.slice(0, SOURCE_CONTEXT_PROMPT_LIMIT);
  const suffix = cleaned.length > SOURCE_CONTEXT_PROMPT_LIMIT ? "..." : "";
  return ` Source context (${sourceName || "operator-provided source"}): ${excerpt}${suffix}.`;
}

export default function O3DEProductionPlanner({
  mode,
  viewportLabel,
  activeToolLabel,
  projectProfileName = null,
  onOpenPromptStudio,
  onOpenBuilder,
}: O3DEProductionPlannerProps) {
  const scenarios = mode === "cinematic" ? cinematicScenarios : gameScenarios;
  const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0].id);
  const [activeSubGenreId, setActiveSubGenreId] = useState<string | null>(
    scenarios[0]?.subGenres?.[0]?.id ?? null,
  );
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeFocusId, setActiveFocusId] = useState(workFocuses[0].id);
  const [sourceMode, setSourceMode] = useState<SourceMode>("paste");
  const [sourceContextName, setSourceContextName] = useState("operator notes");
  const [sourceContext, setSourceContext] = useState("");
  const [sourceStatus, setSourceStatus] = useState("No source context attached yet.");
  const [backendShortcuts, setBackendShortcuts] = useState<PromptShortcutOption[]>([]);
  const [shortcutStatus, setShortcutStatus] = useState(LOCAL_SHORTCUT_STATUS);
  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0];
  const activeSubGenre = activeScenario.subGenres?.find((subGenre) => subGenre.id === activeSubGenreId)
    ?? activeScenario.subGenres?.[0]
    ?? null;
  const activeStage = activeScenario.stages[Math.min(activeStageIndex, activeScenario.stages.length - 1)];
  const activeFocus = workFocuses.find((focus) => focus.id === activeFocusId) ?? workFocuses[0];
  const canMoveBack = activeStageIndex > 0;
  const canMoveForward = activeStageIndex < activeScenario.stages.length - 1;
  const question = mode === "cinematic"
    ? "What type of production are you building?"
    : "What type of game are you building?";
  const profileName = projectProfileName?.trim() || "No selected profile";
  const sourceSummary = summarizeSourceContext(sourceContext, sourceContextName);
  const subGenreSummary = activeSubGenre
    ? ` Sub-genre emphasis: ${activeSubGenre.label}. ${activeSubGenre.promptLead}`
    : "";
  const localShortcutPrompt = (
    `Analyze the current O3DE viewport/context, identify what is visible or selected, then recommend `
    + `the next safe production step. Do not mutate the project yet. Scenario: ${activeScenario.label}.`
    + `${subGenreSummary} `
    + `Stage: ${activeStage.label}. Viewport: ${viewportLabel}. Tool area: ${activeToolLabel}. `
    + `Project profile: ${profileName}.${sourceSummary}`
  );
  const contextAwarePrompt = `${activeFocus.promptLead} ${activeStage.prompt}${subGenreSummary} Current context: ${viewportLabel}; selected tool area: ${activeToolLabel}; project profile: ${profileName}.${sourceSummary}`;
  const displayedShortcuts = backendShortcuts.length > 0
    ? backendShortcuts
    : [
        {
          shortcut_id: "local-analyze-viewport-recommend",
          title: "Analyze viewport and recommend",
          prompt_text: localShortcutPrompt,
          evidence_gate: (
            "Separate observations, recommendations, admitted real actions, simulated/plan-only actions, "
            + "and the evidence to collect next."
          ),
          source: "frontend-local-shortcuts-v1",
        },
      ];

  function resetShortcutRecommendations(): void {
    setBackendShortcuts([]);
    setShortcutStatus(LOCAL_SHORTCUT_STATUS);
  }

  function updateSourceContext(nextContext: string, nextName = sourceContextName) {
    const limitedContext = nextContext.slice(0, SOURCE_CONTEXT_CHAR_LIMIT);
    setSourceContext(limitedContext);
    setSourceContextName(nextName);
    resetShortcutRecommendations();
    setSourceStatus(
      limitedContext.trim()
        ? `Attached ${limitedContext.length} characters from ${nextName || "operator-provided source"}.`
        : "No source context attached yet.",
    );
  }

  async function handleSourceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    setSourceMode("file");
    setSourceStatus(`Reading ${file.name}...`);
    try {
      const text = await file.text();
      updateSourceContext(text, file.name);
    } catch (error) {
      setSourceStatus(error instanceof Error ? error.message : `Could not read ${file.name}.`);
    }
  }

  async function refreshBackendShortcuts() {
    setShortcutStatus("Refreshing backend quick prompts...");
    try {
      const response = await createPromptShortcuts({
        mode,
        scenario_id: activeScenario.id,
        scenario_label: activeScenario.label,
        stage_label: activeStage.label,
        focus_id: activeFocus.id,
        focus_label: activeFocus.label,
        viewport_label: viewportLabel,
        active_tool_label: activeToolLabel,
        project_profile_name: projectProfileName,
        source_context_name: sourceContextName,
        source_context: sourceContext,
      });
      setBackendShortcuts(response.shortcuts);
      setShortcutStatus(`Loaded ${response.shortcuts.length} backend quick prompts from ${response.generated_by}.`);
    } catch (error) {
      setBackendShortcuts([]);
      setShortcutStatus(
        error instanceof Error
          ? `${error.message}; using local quick prompts for now.`
          : "Backend quick prompts failed; using local quick prompts for now.",
      );
    }
  }

  return (
    <section aria-label="O3DE production planner" style={plannerStyle}>
      <div style={plannerHeaderStyle}>
        <div>
          <span style={eyebrowStyle}>Adaptive production roadmap</span>
          <strong>{question}</strong>
          <p style={mutedParagraphStyle}>
            Choose the closest scenario{mode === "game" ? " and a sub-genre emphasis" : ""}. The app then guides the work from brief to release-ready checks
            while keeping O3DE edits behind Runtime, Prompt Studio, Builder, and Records evidence.
          </p>
        </div>
        <span style={scopePillStyle}>Scenario-driven guidance</span>
      </div>

      <div aria-label={question} style={scenarioGridStyle}>
        {scenarios.map((scenario) => {
          const selected = scenario.id === activeScenario.id;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => {
                setActiveScenarioId(scenario.id);
                setActiveSubGenreId(scenario.subGenres?.[0]?.id ?? null);
                setActiveStageIndex(0);
                resetShortcutRecommendations();
              }}
              aria-pressed={selected}
              style={{
                ...scenarioButtonStyle,
                ...(selected ? activeScenarioButtonStyle : null),
              }}
            >
              <strong>{scenario.label}</strong>
              <span>{scenario.description}</span>
            </button>
          );
        })}
      </div>

      <div style={selectedScenarioStyle}>
        <div>
          <span style={eyebrowStyle}>Selected scenario</span>
          <strong>{activeScenario.label}</strong>
          <p style={mutedParagraphStyle}>{activeScenario.description}</p>
        </div>
        <details style={roadmapDisclosureStyle}>
          <summary style={roadmapSummaryStyle}>Preview production milestones</summary>
          <ol style={milestoneListStyle}>
            {activeScenario.stages.map((stage) => (
              <li key={stage.id}>{stage.label}</li>
            ))}
          </ol>
        </details>
      </div>

      {mode === "game" && activeScenario.subGenres?.length ? (
        <div style={subGenrePanelStyle} aria-label="Game sub-genre choice">
          <div>
            <span style={eyebrowStyle}>Sub-genre emphasis</span>
            <strong>Choose a sub-genre emphasis</strong>
            <p style={mutedParagraphStyle}>
              Narrow the current game path so the prompts, milestones, and quick recommendations match the kind
              of game you actually want to build.
            </p>
          </div>
          <div style={subGenreGridStyle}>
            {activeScenario.subGenres.map((subGenre) => {
              const selected = subGenre.id === activeSubGenre?.id;
              return (
                <button
                  key={subGenre.id}
                  type="button"
                  onClick={() => {
                    setActiveSubGenreId(subGenre.id);
                    resetShortcutRecommendations();
                  }}
                  aria-pressed={selected}
                  style={{
                    ...subGenreButtonStyle,
                    ...(selected ? activeSubGenreButtonStyle : null),
                  }}
                >
                  <strong>{subGenre.label}</strong>
                  <span>{subGenre.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={contextPanelStyle} aria-label="Current viewport guidance context">
        <div>
          <span style={eyebrowStyle}>Current context</span>
          <p style={mutedParagraphStyle}>
            These recommendations adapt to the app viewport label, selected O3DE tool area, project profile,
            chosen scenario, current step, and current work focus.
          </p>
        </div>
        <div style={contextGridStyle}>
          <span style={contextItemStyle}><strong>Viewport</strong><span>{viewportLabel}</span></span>
          <span style={contextItemStyle}><strong>Selected tool area</strong><span>{activeToolLabel}</span></span>
          <span style={contextItemStyle}><strong>Project profile</strong><span>{profileName}</span></span>
          {activeSubGenre ? (
            <span style={contextItemStyle}><strong>Sub-genre emphasis</strong><span>{activeSubGenre.label}</span></span>
          ) : null}
        </div>
      </div>

      <div style={sourcePanelStyle} aria-label="Source context upload">
        <div>
          <span style={eyebrowStyle}>Optional source context</span>
          <p style={mutedParagraphStyle}>
            Add context from pasted notes or choose a local file from your computer. The planner uses a bounded
            excerpt for recommendations; it does not persist uploaded source files or backend responses.
          </p>
        </div>
        <div style={buttonRowStyle} aria-label="Source context choice">
          <button
            type="button"
            aria-pressed={sourceMode === "paste"}
            onClick={() => setSourceMode("paste")}
            style={sourceMode === "paste" ? primaryButtonStyle : secondaryButtonStyle}
          >
            Paste notes
          </button>
          <button
            type="button"
            aria-pressed={sourceMode === "file"}
            onClick={() => setSourceMode("file")}
            style={sourceMode === "file" ? primaryButtonStyle : secondaryButtonStyle}
          >
            Choose local file
          </button>
        </div>
        <label style={fieldLabelStyle}>
          Source name or path
          <input
            type="text"
            value={sourceContextName}
            onChange={(event) => {
              setSourceContextName(event.currentTarget.value);
              resetShortcutRecommendations();
            }}
            style={textInputStyle}
            placeholder="design brief, screenshot notes, task handoff, or local path"
          />
        </label>
        {sourceMode === "file" ? (
          <label style={fileInputLabelStyle}>
            Upload source context file
            <input
              type="file"
              aria-label="Upload source context file"
              accept=".txt,.md,.json,.jsonc,.py,.ts,.tsx,.js,.jsx,.cs,.lua,.xml,.cfg,.ini,.prefab"
              onChange={(event) => void handleSourceFileChange(event)}
              style={fileInputStyle}
            />
          </label>
        ) : null}
        <label style={fieldLabelStyle}>
          Source context notes
          <textarea
            value={sourceContext}
            onChange={(event) => updateSourceContext(event.currentTarget.value)}
            rows={4}
            maxLength={SOURCE_CONTEXT_CHAR_LIMIT}
            style={textAreaStyle}
            placeholder="Paste the current task, game brief, screenshot observation, O3DE issue, or operator handoff here."
          />
        </label>
        <span style={sourceStatusStyle}>{sourceStatus}</span>
      </div>

      <div style={focusPanelStyle}>
        <div>
          <span style={eyebrowStyle}>What are you doing in this step?</span>
          <p style={mutedParagraphStyle}>
            Pick the current intent so the next instruction fits what you are actually doing now.
          </p>
        </div>
        <div style={focusGridStyle}>
          {workFocuses.map((focus) => {
            const selected = focus.id === activeFocus.id;
            return (
              <button
                key={focus.id}
                type="button"
                onClick={() => {
                  setActiveFocusId(focus.id);
                  resetShortcutRecommendations();
                }}
                aria-pressed={selected}
                style={{
                  ...focusButtonStyle,
                  ...(selected ? activeFocusButtonStyle : null),
                }}
              >
                <strong>{focus.label}</strong>
                <span>{focus.detail}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={stageDetailStyle} aria-label="Quick prompt shortcuts">
        <div style={plannerHeaderStyle}>
          <div>
            <span style={eyebrowStyle}>Backend quick prompts</span>
            <strong>Fast Codex recommendation starters</strong>
            <p style={mutedParagraphStyle}>
              Use these instead of making Codex re-infer the whole screen. The first shortcut is the viewport
              analysis prompt for “look at what is visible and recommend the next safe move.”
            </p>
          </div>
          <button type="button" onClick={() => void refreshBackendShortcuts()} style={secondaryButtonStyle}>
            Refresh backend shortcuts
          </button>
        </div>
        <div style={shortcutGridStyle}>
          {displayedShortcuts.map((shortcut) => (
            <details key={shortcut.shortcut_id} style={shortcutCardStyle} open={shortcut.shortcut_id.includes("analyze")}>
              <summary style={roadmapSummaryStyle}>{shortcut.title}</summary>
              <p style={mutedParagraphStyle}>{shortcut.prompt_text}</p>
              <p style={mutedParagraphStyle}>
                <strong>Evidence gate:</strong> {shortcut.evidence_gate}
              </p>
              <span style={sourceStatusStyle}>Source: {shortcut.source}</span>
            </details>
          ))}
        </div>
        <span style={sourceStatusStyle}>{shortcutStatus}</span>
      </div>

      <div style={stageDetailStyle} aria-live="polite">
        <div>
          <span style={eyebrowStyle}>Step {activeStageIndex + 1} of {activeScenario.stages.length}</span>
          <strong>{activeStage.label}</strong>
          <p style={mutedParagraphStyle}>{activeStage.outcome}</p>
        </div>
        <div style={stageDetailGridStyle}>
          <span>
            <strong>Context-aware prompt</strong>
            {contextAwarePrompt}
          </span>
          <span>
            <strong>Evidence gate</strong>
            {activeStage.evidence}
          </span>
          <span>
            <strong>Avoid for now</strong>
            {activeStage.avoid}
          </span>
        </div>
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={() => {
              setActiveStageIndex((index) => Math.max(index - 1, 0));
              resetShortcutRecommendations();
            }}
            disabled={!canMoveBack}
            style={secondaryButtonStyle}
          >
            Previous step
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveStageIndex((index) => Math.min(index + 1, activeScenario.stages.length - 1));
              resetShortcutRecommendations();
            }}
            disabled={!canMoveForward}
            style={primaryButtonStyle}
          >
            Next step
          </button>
          {onOpenPromptStudio ? (
            <button type="button" onClick={onOpenPromptStudio} style={primaryButtonStyle}>
              Open Prompt Studio
            </button>
          ) : null}
          {onOpenBuilder ? (
            <button type="button" onClick={onOpenBuilder} style={secondaryButtonStyle}>
              Turn into Builder tasks
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const plannerStyle = {
  display: "grid",
  gap: 12,
  padding: 12,
  border: "1px solid rgba(124, 175, 255, 0.32)",
  borderRadius: "var(--app-card-radius)",
  background: "linear-gradient(135deg, rgba(124, 175, 255, 0.13) 0%, rgba(4, 13, 28, 0.48) 100%)",
} satisfies CSSProperties;

const plannerHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const scenarioGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const scenarioButtonStyle = {
  display: "grid",
  gap: 5,
  minWidth: 0,
  padding: 11,
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 255, 255, 0.07)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  font: "inherit",
  textAlign: "left",
} satisfies CSSProperties;

const activeScenarioButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const selectedScenarioStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 255, 255, 0.05)",
} satisfies CSSProperties;

const subGenrePanelStyle = {
  ...selectedScenarioStyle,
} satisfies CSSProperties;

const subGenreGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const subGenreButtonStyle = {
  ...scenarioButtonStyle,
  minHeight: 86,
} satisfies CSSProperties;

const activeSubGenreButtonStyle = {
  border: "1px solid rgba(255, 205, 103, 0.7)",
  background: "rgba(255, 205, 103, 0.12)",
  boxShadow: "0 0 0 1px rgba(255, 205, 103, 0.22), var(--app-shadow-soft)",
} satisfies CSSProperties;

const contextPanelStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 255, 255, 0.05)",
} satisfies CSSProperties;

const contextGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const contextItemStyle = {
  display: "grid",
  gap: 3,
  minWidth: 0,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const sourcePanelStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid rgba(255, 205, 103, 0.3)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 205, 103, 0.08)",
} satisfies CSSProperties;

const fieldLabelStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-muted-color)",
  fontSize: 13,
  fontWeight: 700,
} satisfies CSSProperties;

const textInputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 10px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  font: "inherit",
} satisfies CSSProperties;

const textAreaStyle = {
  ...textInputStyle,
  resize: "vertical",
  minHeight: 96,
  borderRadius: "var(--app-card-radius)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const fileInputLabelStyle = {
  ...fieldLabelStyle,
  alignItems: "start",
} satisfies CSSProperties;

const fileInputStyle = {
  width: "100%",
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const sourceStatusStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;

const focusPanelStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const focusGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const focusButtonStyle = {
  display: "grid",
  gap: 4,
  padding: 10,
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 255, 255, 0.07)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  font: "inherit",
  textAlign: "left",
} satisfies CSSProperties;

const activeFocusButtonStyle = {
  border: "1px solid var(--app-success-border)",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
} satisfies CSSProperties;

const roadmapDisclosureStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 255, 255, 0.07)",
} satisfies CSSProperties;

const roadmapSummaryStyle = {
  cursor: "pointer",
  color: "var(--app-text-color)",
  fontWeight: 700,
} satisfies CSSProperties;

const milestoneListStyle = {
  margin: "8px 0 0",
  paddingLeft: 20,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const stageDetailStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const stageDetailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const shortcutGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const shortcutCardStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 255, 255, 0.05)",
} satisfies CSSProperties;

const buttonRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  cursor: "pointer",
  fontWeight: 800,
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 700,
} satisfies CSSProperties;

const scopePillStyle = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const eyebrowStyle = {
  display: "block",
  marginBottom: 4,
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
} satisfies CSSProperties;

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;
