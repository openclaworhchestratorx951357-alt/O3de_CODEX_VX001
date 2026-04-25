export type OperatorGuideShellApp = {
  title: string;
  subtitle: string;
};

export type OperatorGuideShellQuickStat = {
  id: "approvals" | "bridge" | "warnings" | "runs";
  label: string;
  tooltip: string;
};

export type OperatorGuideShellWorkspace = {
  id: "home" | "prompt" | "builder" | "operations" | "runtime" | "records";
  navLabel: string;
  navSubtitle: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  tooltip: string;
  operatorChecklist?: string[];
  launchpad?: {
    label: string;
    description: string;
    tooltip: string;
  };
};

export type OperatorGuideShellWorkspaceWindow = {
  workspaceId: "home";
  id: string;
  title: string;
  subtitle: string;
  tooltip: string;
  instructions: string[];
};

export type OperatorGuideShellSurface = {
  workspaceId: "operations" | "runtime" | "records";
  id: string;
  label: string;
  detail: string;
  tooltip: string;
};

export type OperatorGuideShellPanelControl = {
  panelId: string;
  controlId: string;
  label: string;
  tooltip: string;
};

export type OperatorGuideShellPanel = {
  id: string;
  label: string;
  tooltip: string;
  checklist: string[];
};

export const operatorGuideShellApp: OperatorGuideShellApp = {
  title: "O3DE Agent Control App",
  subtitle: "Windows-style control-plane workspace for O3DE operators",
};

const quickStats: OperatorGuideShellQuickStat[] = [
  {
    id: "approvals",
    label: "Approvals",
    tooltip: "Shows how many approval decisions are still waiting in Command Center. Open Approvals when this is not clear.",
  },
  {
    id: "bridge",
    label: "Bridge",
    tooltip: "Shows whether the editor bridge heartbeat is fresh. Open Runtime Overview when this turns stale or warning.",
  },
  {
    id: "warnings",
    label: "Warnings",
    tooltip: "Counts executions that still need operator review. Open Records > Executions to inspect truth markers and evidence.",
  },
  {
    id: "runs",
    label: "Runs",
    tooltip: "Counts unresolved run lanes. Open Records > Runs before closing work or handing off.",
  },
];

const workspaces: OperatorGuideShellWorkspace[] = [
  {
    id: "home",
    navLabel: "Home",
    navSubtitle: "Overview and launchpad",
    workspaceTitle: "Home",
    workspaceSubtitle: "Mission control, review memory, guidebook, and launch surfaces.",
    tooltip: "Open Home first to refresh the operator picture, recover lane context, and launch into the deeper workspaces intentionally.",
    operatorChecklist: [
      "Refresh the dashboard when you need a current top-level read of approvals, warnings, runs, and bridge health.",
      "Use Launchpad to move into a purpose-built workspace instead of staying on a continuous scrolling surface.",
      "Review Operator Overview before handoff, when warnings climb, or when lane memory needs a quick sanity check.",
      "Keep the Guidebook nearby while onboarding or when a surface has not been used recently.",
    ],
  },
  {
    id: "prompt",
    navLabel: "Prompt Studio",
    navSubtitle: "Natural-language control",
    workspaceTitle: "Prompt Studio",
    workspaceSubtitle: "Natural-language entry point with explicit admitted-surface guardrails.",
    tooltip: "Use Prompt Studio for natural-language requests, while keeping simulated versus admitted-real wording explicit.",
    launchpad: {
      label: "Prompt Studio",
      description: "Natural-language planning and admitted typed execution paths.",
      tooltip: "Open Prompt Studio when you want to work through the app in natural language while preserving truth markers.",
    },
  },
  {
    id: "builder",
    navLabel: "Builder",
    navSubtitle: "Worktrees and lanes",
    workspaceTitle: "Builder",
    workspaceSubtitle: "Repo lanes, worktrees, mission board, and helper-thread coordination.",
    tooltip: "Open Builder for repo-native lane management, worktree readiness, and shared coordination state before a coding thread starts.",
    launchpad: {
      label: "Builder",
      description: "Worktree lanes, branch ownership, and repo mission-control coordination.",
      tooltip: "Open Builder when the next step needs a worktree, branch lane, or shared coordination state before coding starts.",
    },
  },
  {
    id: "operations",
    navLabel: "Command Center",
    navSubtitle: "Dispatch, agents, approvals",
    workspaceTitle: "Command Center",
    workspaceSubtitle: "Catalog browsing, dispatch, approvals, timeline, and agent coordination.",
    tooltip: "Open Command Center for dispatch mechanics, agent ownership detail, approval decisions, and timeline review.",
    launchpad: {
      label: "Command Center",
      description: "Catalog browsing, dispatch, approvals, and live timeline control.",
      tooltip: "Open Command Center when you need explicit dispatch and control-plane coordination instead of free-form prompting.",
    },
  },
  {
    id: "runtime",
    navLabel: "Runtime",
    navSubtitle: "Bridge, executors, workspaces",
    workspaceTitle: "Runtime",
    workspaceSubtitle: "Bridge health, system status, executors, workspaces, and governance lanes.",
    tooltip: "Use Runtime to confirm bridge heartbeat freshness, inspect runtime ownership, and validate governance posture before claiming real-editor coverage.",
    launchpad: {
      label: "Runtime",
      description: "Bridge status, executors, workspaces, and governance health.",
      tooltip: "Open Runtime when you need live health and posture confirmation before making real-editor claims.",
    },
  },
  {
    id: "records",
    navLabel: "Records",
    navSubtitle: "Runs, executions, artifacts, events",
    workspaceTitle: "Records",
    workspaceSubtitle: "Runs, executions, artifacts, and event receipts arranged into focused inspection surfaces.",
    tooltip: "Use Records to inspect persisted evidence, warnings, truth markers, event receipts, and output artifacts before handoff or closeout.",
    launchpad: {
      label: "Records Explorer",
      description: "Runs, executions, artifacts, and detail drilldowns in one organized lane.",
      tooltip: "Open Records when you need persisted evidence rather than only live status.",
    },
  },
];

const windows: OperatorGuideShellWorkspaceWindow[] = [
  {
    workspaceId: "home",
    id: "mission-control",
    title: "Mission Control",
    subtitle: "High-level operator shell controls, lane memory, and refresh entry points.",
    tooltip: "Refresh dashboard state, inspect pinned lane context, and recover the operator's current working posture from one place.",
    instructions: [
      "Use the refresh actions first when you suspect the desktop is stale.",
      "Review pinned record, lane memory, and recovery controls before reopening work on an existing run.",
      "Save lane notes here when you need continuity between sessions or handoffs.",
    ],
  },
  {
    workspaceId: "home",
    id: "launchpad",
    title: "Launchpad",
    subtitle: "Open focused workspaces instead of hunting through one continuous operator page.",
    tooltip: "Jump directly into Prompt Studio, Builder, Command Center, Runtime, or Records with the workspace preselected for the intended task.",
    instructions: [
      "Use Launchpad as the fastest route into a specific workflow.",
      "Pick Prompt Studio for natural-language requests, Builder for worktree lanes and mission control, Command Center for dispatch and approvals, Runtime for bridge health, and Records for evidence review.",
      "Treat Launchpad as navigation, not as a substitute for the deeper workspace itself.",
    ],
  },
  {
    workspaceId: "home",
    id: "operator-overview",
    title: "Operator Overview",
    subtitle: "Attention queue, handoff posture, and browser-local review memory.",
    tooltip: "Check the attention queue and review posture here before assuming a lane is ready to close or hand off.",
    instructions: [
      "Use this window to see what needs attention next.",
      "Confirm handoff readiness here before you summarize work for another operator or agent.",
      "Use it as the final stop before closing the session if warnings or unresolved items remain.",
    ],
  },
  {
    workspaceId: "home",
    id: "guidebook",
    title: "Operator Guidebook",
    subtitle: "In-app instructions, capability posture, and workspace-by-workspace usage notes.",
    tooltip: "Read the whole desktop runbook inside the app. This mirrors the generated operator guide document.",
    instructions: [
      "Use the guidebook while onboarding or after layout changes.",
      "Check the capability posture section before describing admitted-real scope to others.",
      "If the app changes, update this catalog first so the guidebook and generated docs stay synchronized.",
    ],
  },
];

const surfaces: OperatorGuideShellSurface[] = [
  {
    workspaceId: "operations",
    id: "dispatch",
    label: "Dispatch",
    detail: "Catalog, typed dispatch, and latest response envelope.",
    tooltip: "Browse the catalog, inspect adapters, dispatch a request, and review the latest response envelope in one place.",
  },
  {
    workspaceId: "operations",
    id: "agents",
    label: "Agents",
    detail: "Available operator families and owned tool lanes.",
    tooltip: "Use this tab to inspect which agent family owns which lane before dispatching work or assuming capability.",
  },
  {
    workspaceId: "operations",
    id: "approvals",
    label: "Approvals",
    detail: "Pending decisions on the control-plane queue.",
    tooltip: "Resolve queued approval requests here before claiming a task is unblocked or complete.",
  },
  {
    workspaceId: "operations",
    id: "timeline",
    label: "Timeline",
    detail: "Cross-record event and task history.",
    tooltip: "Review the sequence of events here when reconstructing what happened across runs, executions, and approvals.",
  },
  {
    workspaceId: "runtime",
    id: "overview",
    label: "Overview",
    detail: "Bridge health, runtime status, and system summaries.",
    tooltip: "Start here for heartbeat freshness, runtime summaries, and first-pass bridge status.",
  },
  {
    workspaceId: "runtime",
    id: "executors",
    label: "Executors",
    detail: "Execution owners, availability, and related records.",
    tooltip: "Inspect executor availability and ownership here before routing work or diagnosing missing capacity.",
  },
  {
    workspaceId: "runtime",
    id: "workspaces",
    label: "Workspaces",
    detail: "Project surfaces, ownership, and attached activity.",
    tooltip: "Use this tab to inspect project workspace coverage and attached activity before assuming a target is live.",
  },
  {
    workspaceId: "runtime",
    id: "governance",
    label: "Governance",
    detail: "Policies, locks, and admitted capability posture.",
    tooltip: "Open Governance to inspect policies, locks, and the currently admitted capability boundary.",
  },
  {
    workspaceId: "records",
    id: "runs",
    label: "Runs",
    detail: "Dispatch lineage and run-level audit slices.",
    tooltip: "Use Runs for lineage, unresolved work, and high-level audit review.",
  },
  {
    workspaceId: "records",
    id: "executions",
    label: "Executions",
    detail: "Execution warnings, truth markers, and child evidence.",
    tooltip: "Inspect execution warnings and truth markers here before claiming success or admitted-real outcome.",
  },
  {
    workspaceId: "records",
    id: "artifacts",
    label: "Artifacts",
    detail: "Output inspection and mutation-risk evidence.",
    tooltip: "Use Artifacts to inspect outputs, evidence summaries, and mutation risk before sharing or promoting results.",
  },
  {
    workspaceId: "records",
    id: "events",
    label: "Events",
    detail: "Timeline chronology and persisted event receipts.",
    tooltip: "Use Events to inspect persisted timeline records, including App OS audit receipts and event-level metadata.",
  },
];

const panelControls: OperatorGuideShellPanelControl[] = [
  {
    panelId: "operator-overview",
    controlId: "lane-actions",
    label: "Lane actions",
    tooltip: "Use the pinned-lane actions to refocus, clear, recover, annotate, or filter the current operator lane.",
  },
  {
    panelId: "operator-overview",
    controlId: "refresh",
    label: "Refresh overview",
    tooltip: "Refresh the home overview when the persisted aggregate may be stale.",
  },
  {
    panelId: "operator-overview",
    controlId: "status-filters",
    label: "Status filter chips",
    tooltip: "Use the status chips to jump into the matching run, approval, execution, artifact, event, executor, or workspace lane.",
  },
  {
    panelId: "overview-attention",
    controlId: "recommendation-card",
    label: "Recommendation cards",
    tooltip: "Read each recommendation card for the local suggestion label, why it surfaced, and what the browser session thinks needs attention next.",
  },
  {
    panelId: "overview-attention",
    controlId: "action-buttons",
    label: "Recommendation actions",
    tooltip: "Use the recommendation actions to jump directly into the suggested lane or its secondary follow-up.",
  },
  {
    panelId: "overview-closeout-readiness",
    controlId: "readiness-entry",
    label: "Readiness entries",
    tooltip: "Review each readiness entry for lane, focus, summary label, and the local reason it is ready or still pending.",
  },
  {
    panelId: "overview-context-memory",
    controlId: "clear-all",
    label: "Clear all presets",
    tooltip: "Use Clear all local context presets only when the current browser-session memory is stale or no longer useful.",
  },
  {
    panelId: "overview-context-memory",
    controlId: "open-context",
    label: "Open saved context",
    tooltip: "Use Open saved context to restore the selected browser-local memory entry.",
  },
  {
    panelId: "overview-context-memory",
    controlId: "local-review-actions",
    label: "Local review actions",
    tooltip: "Use the local review actions to triage, mark reviewed, snooze, or return the memory entry to queue.",
  },
  {
    panelId: "overview-context-memory",
    controlId: "note-editor",
    label: "Note editor",
    tooltip: "Use the note editor to save a browser-local note for this memory entry.",
  },
  {
    panelId: "overview-context-memory",
    controlId: "clear-entry",
    label: "Clear saved context",
    tooltip: "Use Clear saved context to remove a single stale browser-local memory entry.",
  },
  {
    panelId: "overview-context-strip",
    controlId: "history-entry",
    label: "History entries",
    tooltip: "Use the history entries to replay recent overview-driven contexts from this browser session.",
  },
  {
    panelId: "overview-context-strip",
    controlId: "preset-actions",
    label: "Preset actions",
    tooltip: "Use the preset actions to save, reapply, or clear browser-local overview presets.",
  },
  {
    panelId: "overview-context-strip",
    controlId: "clear-focus",
    label: "Clear focus",
    tooltip: "Use Clear overview context when you want the current lane to stop following the active overview drilldown.",
  },
  {
    panelId: "overview-handoff-confidence",
    controlId: "confidence-summary",
    label: "Confidence summary",
    tooltip: "Use the confidence summary to judge whether the current browser-local handoff posture is high-confidence, cautionary, or risky.",
  },
  {
    panelId: "overview-handoff-export",
    controlId: "copy-draft",
    label: "Copy handoff draft",
    tooltip: "Use Copy handoff draft to place the current browser-local handoff text on the clipboard.",
  },
  {
    panelId: "overview-handoff-export",
    controlId: "draft-preview",
    label: "Draft preview",
    tooltip: "Inspect the draft preview to confirm the exact handoff text that would be copied from the current browser session.",
  },
  {
    panelId: "overview-handoff-package",
    controlId: "package-entry",
    label: "Package entry cards",
    tooltip: "Review each package entry card to see whether that saved context is included now or excluded pending follow-up.",
  },
  {
    panelId: "overview-review-queue",
    controlId: "queue-entry",
    label: "Queue entry cards",
    tooltip: "Review each queue entry for lane, priority, saved context, and the next suggested check before taking action.",
  },
  {
    panelId: "overview-review-queue",
    controlId: "open-context",
    label: "Open saved context",
    tooltip: "Use Open saved context to restore the selected browser-local review lane before you act on it.",
  },
  {
    panelId: "overview-review-queue",
    controlId: "triage-actions",
    label: "Triage actions",
    tooltip: "Use the triage actions to open follow-up detail, mark reviewed, snooze, or return an entry to the active queue.",
  },
  {
    panelId: "overview-review-session",
    controlId: "session-actions",
    label: "Session actions",
    tooltip: "Use the session actions to copy a session snapshot, return all entries to queue, or clear the browser-local review state.",
  },
];

const panels: OperatorGuideShellPanel[] = [
  {
    id: "operator-overview",
    label: "Operator Overview",
    tooltip: "Use Operator Overview for a compact persisted summary of approvals, runs, executions, artifacts, events, locks, executors, and workspace pressure before handoff or closeout.",
    checklist: [
      "Refresh overview first when the home workspace may be stale.",
      "Use the status chips as filter shortcuts into the deeper workspaces instead of treating them as the full investigation surface.",
      "Read pinned-lane actions and review posture before you summarize work as complete.",
    ],
  },
  {
    id: "overview-attention",
    label: "Attention Recommendations",
    tooltip: "Use Attention Recommendations for browser-local suggestions about what the operator should inspect next based on current review memory and persisted records.",
    checklist: [
      "Treat these recommendations as frontend guidance, not backend orchestration output.",
      "Use the recommendation detail to decide which workspace or record deserves focus first.",
      "Open the suggested lane before assuming the recommendation is still current.",
    ],
  },
  {
    id: "overview-closeout-readiness",
    label: "Closeout Readiness",
    tooltip: "Use Closeout Readiness for a browser-local check of which saved contexts look ready for handoff versus still needing follow-up.",
    checklist: [
      "Read the ready versus follow-up counts before you summarize session closeout posture.",
      "Treat this as a frontend readiness aid only, not backend workflow truth.",
      "Use entry detail to understand why a saved context still looks incomplete.",
    ],
  },
  {
    id: "overview-context-memory",
    label: "Workspace Memory",
    tooltip: "Use Workspace Memory to manage browser-local saved overview contexts, notes, and review disposition without creating backend persistence.",
    checklist: [
      "Read the lane and origin badges before reopening an old saved context.",
      "Use notes and review actions to keep local handoff memory truthful and current.",
      "Clear stale entries when they no longer match the current operator lane.",
    ],
  },
  {
    id: "overview-context-strip",
    label: "Active Overview Context",
    tooltip: "Use Active Overview Context to keep track of which lane is currently being driven from a home-overview drilldown or browser-local preset.",
    checklist: [
      "Read the active focus and origin before assuming the current lane opened itself naturally.",
      "Use local preset and history controls to keep browser-session navigation memory deliberate.",
      "Clear stale focus when the overview-driven context no longer matches the current investigation.",
    ],
  },
  {
    id: "overview-handoff-confidence",
    label: "Handoff Confidence",
    tooltip: "Use Handoff Confidence for a browser-local risk summary of whether the current handoff draft looks strong, cautionary, or risky.",
    checklist: [
      "Read the confidence label together with stale, drifted, excluded, and changed-since-snapshot counts.",
      "Treat this as a local operator cue only and not as backend policy or approval state.",
      "Use it to decide whether a handoff needs another review pass before export.",
    ],
  },
  {
    id: "overview-handoff-export",
    label: "Handoff Export Draft",
    tooltip: "Use Handoff Export Draft to preview and copy the browser-local operator handoff text built from the current saved contexts.",
    checklist: [
      "Read included and excluded counts before copying the draft.",
      "Treat the draft as browser-local preview text only; it is not backend-persisted handoff state.",
      "Use the draft preview to sanity-check provenance and readiness language before sharing it.",
    ],
  },
  {
    id: "overview-handoff-package",
    label: "Local Handoff Package Preview",
    tooltip: "Use Local Handoff Package Preview to see which saved contexts would currently be included or excluded from a strong browser-local handoff package.",
    checklist: [
      "Read the included and excluded counts before deciding the handoff is ready.",
      "Use provenance detail to explain why an entry is included now or still excluded for follow-up.",
      "Treat this package preview as browser-local operator guidance only.",
    ],
  },
  {
    id: "overview-review-queue",
    label: "Review Queue",
    tooltip: "Use Review Queue to reopen the highest-priority browser-local execution and artifact contexts that still need operator review.",
    checklist: [
      "Read the focus label and priority detail before reopening a saved context.",
      "Use the queue as a browser-session review aid only; it does not persist server-side triage.",
      "Mark, snooze, or keep entries in queue so the home overview reflects your actual review state.",
    ],
  },
  {
    id: "overview-review-session",
    label: "Review Session Summary",
    tooltip: "Use Review Session Summary to inspect browser-local counts for in-queue, snoozed, reviewed, stale, and drifted saved contexts.",
    checklist: [
      "Read the queue and drift counts before assuming the local review session is healthy.",
      "Use snapshot and compare labels to understand how the session changed over time.",
      "Use the session actions carefully because they affect browser-local review state for all saved contexts.",
    ],
  },
];

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

export function getShellQuickStatGuide(id: OperatorGuideShellQuickStat["id"]): OperatorGuideShellQuickStat {
  return requireValue(
    quickStats.find((entry) => entry.id === id),
    `Missing operator guide shell quick-stat entry for "${id}".`,
  );
}

export function getShellWorkspaceGuide(id: OperatorGuideShellWorkspace["id"]): OperatorGuideShellWorkspace {
  return requireValue(
    workspaces.find((entry) => entry.id === id),
    `Missing operator guide shell workspace entry for "${id}".`,
  );
}

export function getShellWorkspaceWindowGuide(
  workspaceId: OperatorGuideShellWorkspaceWindow["workspaceId"],
  windowId: string,
): OperatorGuideShellWorkspaceWindow {
  return requireValue(
    windows.find((entry) => entry.workspaceId === workspaceId && entry.id === windowId),
    `Missing operator guide shell window entry for "${workspaceId}.${windowId}".`,
  );
}

export function getShellWorkspaceSurfaceGuide(
  workspaceId: OperatorGuideShellSurface["workspaceId"],
  surfaceId: string,
): OperatorGuideShellSurface {
  return requireValue(
    surfaces.find((entry) => entry.workspaceId === workspaceId && entry.id === surfaceId),
    `Missing operator guide shell surface entry for "${workspaceId}.${surfaceId}".`,
  );
}

export function getShellPanelControlGuide(
  panelId: string,
  controlId: string,
): OperatorGuideShellPanelControl {
  return requireValue(
    panelControls.find((entry) => entry.panelId === panelId && entry.controlId === controlId),
    `Missing operator guide shell panel control entry for "${panelId}.${controlId}".`,
  );
}

export function getShellPanelGuide(panelId: string): OperatorGuideShellPanel {
  return requireValue(
    panels.find((entry) => entry.id === panelId),
    `Missing operator guide shell panel entry for "${panelId}".`,
  );
}
