import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  createPromptSession,
  executePromptSession,
  fetchO3deTarget,
  fetchPromptCapabilities,
  fetchPromptSession,
  fetchPromptSessions,
} from "../lib/api";
import { loadActiveO3DEProjectProfile } from "../lib/o3deProjectProfiles";
import {
  summarizePlacementProofOnlyReview,
  type PlacementProofOnlyReviewSnapshot,
} from "../lib/promptPlacementProofOnlyReview";
import type {
  O3DETargetConfig,
  PromptCapabilityEntry,
  PromptRequest,
  PromptSessionRecord,
} from "../types/contracts";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";
import { useSettings } from "../lib/settings/hooks";
import type { MissionPromptDraft } from "../lib/missionPromptTemplates";
import PanelGuideDetails from "./PanelGuideDetails";
import PromptCapabilityPanel from "./PromptCapabilityPanel";
import PromptExecutionTimeline from "./PromptExecutionTimeline";
import PromptPlanPanel from "./PromptPlanPanel";
import PromptSessionPanel from "./PromptSessionPanel";

const promptControlGuide = getPanelGuide("prompt-control");
const promptControlPromptTextGuide = getPanelControlGuide("prompt-control", "prompt-text");
const promptControlProjectRootGuide = getPanelControlGuide("prompt-control", "project-root");
const promptControlEngineRootGuide = getPanelControlGuide("prompt-control", "engine-root");
const promptControlWorkspaceIdGuide = getPanelControlGuide("prompt-control", "workspace-id");
const promptControlExecutorIdGuide = getPanelControlGuide("prompt-control", "executor-id");
const promptControlPreferredDomainsGuide = getPanelControlGuide("prompt-control", "preferred-domains");
const promptControlOperatorNoteGuide = getPanelControlGuide("prompt-control", "operator-note");
const promptControlDryRunGuide = getPanelControlGuide("prompt-control", "dry-run");
const promptControlPreviewPlanGuide = getPanelControlGuide("prompt-control", "preview-plan");
const promptControlRefreshSessionsGuide = getPanelControlGuide("prompt-control", "refresh-sessions");
const promptControlExecuteSelectedGuide = getPanelControlGuide("prompt-control", "execute-selected");

type PromptControlPanelProps = {
  selectedWorkspaceId?: string | null;
  selectedExecutorId?: string | null;
  promptLaunchDraftRequest?: PromptLaunchDraftRequest | null;
  onReturnToSourceWorkspace?: (workspaceId: string) => void;
  onPlacementProofOnlyReviewChange?: (review: PlacementProofOnlyReviewSnapshot | null) => void;
};

export type PromptLaunchDraftRequest = {
  requestId: string;
  draft: MissionPromptDraft;
  sourceSurfaceLabel?: string | null;
  launchedAtIso?: string | null;
  sourceWorkspaceId?: string | null;
};

type PromptDraftRecommendation = {
  id: string;
  label: string;
  group: "beginner-safe" | "admitted-real";
  detail: string;
  reason: string;
  signals: readonly string[];
  promptText: string;
  preferredDomainsText: string;
  operatorNote: string;
  dryRun: boolean;
};

type PromptDraftRecommendationGroup = {
  id: PromptDraftRecommendation["group"];
  label: string;
  description: string;
  entries: PromptDraftRecommendation[];
};

function hasPromptCapability(
  capabilities: readonly PromptCapabilityEntry[],
  toolName: string,
): boolean {
  return capabilities.some((capability) => capability.tool_name === toolName);
}

function getProjectNameFromRoot(projectRoot: string): string | null {
  return projectRoot.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

function getTargetProjectLabel(
  targetConfig: O3DETargetConfig | null,
  activeProjectProfile: O3DEProjectProfile,
): string {
  const profileProjectRoot = activeProjectProfile.projectRoot.trim();
  if (profileProjectRoot) {
    const projectName = getProjectNameFromRoot(profileProjectRoot);
    return projectName
      ? `the selected ${projectName} project profile`
      : "the selected O3DE project profile";
  }

  const projectRoot = targetConfig?.project_root?.trim();
  if (!projectRoot) {
    return "the selected O3DE target";
  }

  const projectName = getProjectNameFromRoot(projectRoot);
  return projectName ? `the current ${projectName} target` : "the current configured O3DE target";
}

function buildPromptDraftRecommendations({
  capabilities,
  activeProjectProfile,
  targetConfig,
  sessionCount,
}: {
  capabilities: readonly PromptCapabilityEntry[];
  activeProjectProfile: O3DEProjectProfile;
  targetConfig: O3DETargetConfig | null;
  sessionCount: number;
}): PromptDraftRecommendation[] {
  const recommendations: PromptDraftRecommendation[] = [];
  const targetLabel = getTargetProjectLabel(targetConfig, activeProjectProfile);

  if (hasPromptCapability(capabilities, "project.inspect")) {
    recommendations.push({
      id: "inspect-project-first",
      label: "Inspect project before changing content",
      group: "beginner-safe",
      detail: "Best first move when a user is unsure: gather project evidence and keep the request read-only.",
      reason: "Project inspection is a low-risk orientation step because it asks the backend to summarize target evidence before any content mutation.",
      signals: [
        "project.inspect is available in the prompt capability registry",
        "dry run stays on",
        "operator note marks this as read-only orientation",
      ],
      promptText: `Inspect ${targetLabel} and summarize the project evidence, current target assumptions, and the safest next O3DE authoring step. Do not create or modify content yet.`,
      preferredDomainsText: "project-build",
      operatorNote: "Template recommendation: read-only project orientation before any O3DE mutation.",
      dryRun: true,
    });
  }

  if (hasPromptCapability(capabilities, "editor.session.open")) {
    recommendations.push({
      id: "open-editor-session",
      label: "Open current editor session safely",
      group: "admitted-real",
      detail: "Use this before level, entity, or component work so the bridge-backed editor session is explicit.",
      reason: "Editor work needs an admitted session foundation before later level or entity operations can claim real authoring evidence.",
      signals: [
        "editor.session.open is available",
        "template avoids level open and content mutation",
        "preferred domain is editor-control",
      ],
      promptText: `Open an editor session for ${targetLabel} and report the real editor-session evidence. Do not open a level or mutate content in this prompt.`,
      preferredDomainsText: "editor-control",
      operatorNote: "Template recommendation: attach the editor session first and keep this prompt non-mutating.",
      dryRun: false,
    });
  }

  if (
    hasPromptCapability(capabilities, "editor.session.open")
    && hasPromptCapability(capabilities, "editor.level.open")
    && hasPromptCapability(capabilities, "editor.entity.create")
  ) {
    recommendations.push({
      id: "narrow-entity-proof",
      label: "Create one safe test entity",
      group: "admitted-real",
      detail: "Uses the admitted narrow entity-create path only: session, level, root-level named entity.",
      reason: "This is the smallest useful real-authoring mutation template because it stays inside the proven root-level named entity boundary.",
      signals: [
        "editor.session.open, editor.level.open, and editor.entity.create are available",
        "no parent_entity_id, prefab_asset, position, components, or properties",
        "operator note calls out the narrow admitted-real boundary",
      ],
      promptText: 'Open level "Levels/DefaultLevel" in the editor and create one root-level entity named "CodexPromptTemplateEntity". Do not set parent_entity_id, prefab_asset, position, components, or properties.',
      preferredDomainsText: "editor-control",
      operatorNote: "Template recommendation: narrow admitted-real proof only; root-level named entity, no transform/component/prefab work.",
      dryRun: false,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "capability-orientation",
      label: "Ask for a safe capability plan",
      group: "beginner-safe",
      detail: "Fallback starter when the capability registry is still loading or the backend exposes a limited prompt surface.",
      reason: "When capability truth is incomplete, the safest prompt asks for a plan and explicitly avoids execution until an admitted path is visible.",
      signals: [
        "no stronger capability-specific template is available yet",
        "dry run stays on",
        "prompt asks for capability review before action",
      ],
      promptText: "Review the current prompt capability registry and recommend the safest next O3DE action. Do not execute content mutation until the admitted tool path is explicit.",
      preferredDomainsText: "",
      operatorNote: "Template recommendation: capability orientation only; keep execution gated by preview and approval.",
      dryRun: true,
    });
  }

  if (sessionCount > 0) {
    recommendations.push({
      id: "continue-existing-session",
      label: "Review recent prompt continuity",
      group: "beginner-safe",
      detail: "Use this when there are existing prompt sessions and you want the next step without losing lineage.",
      reason: "Continuity review helps avoid duplicate work by checking the latest prompt session lineage before creating or executing another prompt.",
      signals: [
        `prompt sessions visible = ${sessionCount}`,
        "dry run stays on",
        "prompt asks for approvals and evidence before execution",
      ],
      promptText: "Review the latest prompt session lineage and explain the next safe continuation step, including any approval or evidence that must be checked before execution.",
      preferredDomainsText: "editor-control",
      operatorNote: "Template recommendation: continuity review before continuing or creating another prompt session.",
      dryRun: true,
    });
  }

  return recommendations.slice(0, 3);
}

function groupPromptDraftRecommendations(
  recommendations: readonly PromptDraftRecommendation[],
): PromptDraftRecommendationGroup[] {
  const groups: PromptDraftRecommendationGroup[] = [
    {
      id: "beginner-safe",
      label: "Beginner-safe starters",
      description: "Planning, inspection, or continuity prompts that keep mutation risk low.",
      entries: recommendations.filter((recommendation) => recommendation.group === "beginner-safe"),
    },
    {
      id: "admitted-real",
      label: "Admitted-real editor actions",
      description: "Bridge-backed templates that still require preview, approval, and exact capability boundaries.",
      entries: recommendations.filter((recommendation) => recommendation.group === "admitted-real"),
    },
  ];

  return groups.filter((group) => group.entries.length > 0);
}

function getPromptRecommendationGroupLabel(group: PromptDraftRecommendation["group"]): string {
  return group === "admitted-real" ? "Admitted-real editor actions" : "Beginner-safe starters";
}

export default function PromptControlPanel({
  selectedWorkspaceId = null,
  selectedExecutorId = null,
  promptLaunchDraftRequest = null,
  onReturnToSourceWorkspace,
  onPlacementProofOnlyReviewChange,
}: PromptControlPanelProps) {
  const { settings } = useSettings();
  const [activeProjectProfile] = useState(() => loadActiveO3DEProjectProfile());
  const [promptText, setPromptText] = useState("");
  const [projectRoot, setProjectRoot] = useState(
    settings.operatorDefaults.projectRoot || activeProjectProfile.projectRoot,
  );
  const [engineRoot, setEngineRoot] = useState(
    settings.operatorDefaults.engineRoot || activeProjectProfile.engineRoot,
  );
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceIdEdited, setWorkspaceIdEdited] = useState(false);
  const [executorId, setExecutorId] = useState("");
  const [executorIdEdited, setExecutorIdEdited] = useState(false);
  const [preferredDomainsText, setPreferredDomainsText] = useState("");
  const [operatorNote, setOperatorNote] = useState("");
  const [dryRun, setDryRun] = useState(settings.operatorDefaults.dryRun);
  const [sessions, setSessions] = useState<PromptSessionRecord[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<PromptSessionRecord | null>(null);
  const [capabilities, setCapabilities] = useState<PromptCapabilityEntry[]>([]);
  const [targetConfig, setTargetConfig] = useState<O3DETargetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptRecommendationMessage, setPromptRecommendationMessage] = useState<string | null>(null);
  const [loadedPromptRecommendation, setLoadedPromptRecommendation] =
    useState<PromptDraftRecommendation | null>(null);
  const [loadedMissionDraft, setLoadedMissionDraft] = useState<MissionPromptDraft | null>(null);
  const [loadedMissionDraftSourceSurfaceLabel, setLoadedMissionDraftSourceSurfaceLabel] =
    useState<string | null>(null);
  const [loadedMissionDraftLaunchedAtIso, setLoadedMissionDraftLaunchedAtIso] =
    useState<string | null>(null);
  const [loadedMissionDraftSourceWorkspaceId, setLoadedMissionDraftSourceWorkspaceId] =
    useState<string | null>(null);
  const previousOperatorDefaultsRef = useRef(settings.operatorDefaults);
  const lastPromptLaunchRequestIdRef = useRef<string | null>(null);
  const suppressNextDryRunDefaultsSyncRef = useRef(false);
  const initialProjectRootRef = useRef(projectRoot);
  const initialEngineRootRef = useRef(engineRoot);
  const effectiveWorkspaceId = workspaceIdEdited ? workspaceId : (selectedWorkspaceId ?? "");
  const effectiveExecutorId = executorIdEdited ? executorId : (selectedExecutorId ?? "");
  const preferredDomainSuggestions = Array.from(new Set(
    capabilities
      .map((capability) => capability.agent_family.trim())
      .filter(Boolean),
  ));
  const preferredDomainsPlaceholder = preferredDomainSuggestions.length > 0
    ? preferredDomainSuggestions.join(", ")
    : "Leave blank to allow the planner to choose from admitted domains.";
  const projectRootEnv = (import.meta.env.VITE_O3DE_TARGET_PROJECT_ROOT as string | undefined) ?? "";
  const engineRootEnv = (import.meta.env.VITE_O3DE_TARGET_ENGINE_ROOT as string | undefined) ?? "";
  const promptDraftRecommendations = buildPromptDraftRecommendations({
    capabilities,
    activeProjectProfile,
    targetConfig,
    sessionCount: sessions.length,
  });
  const promptDraftRecommendationGroups = groupPromptDraftRecommendations(promptDraftRecommendations);

  const getDefaultProjectRoot = useCallback((nextTarget: O3DETargetConfig | null): string => (
    settings.operatorDefaults.projectRoot
      || activeProjectProfile.projectRoot
      || nextTarget?.project_root
      || projectRootEnv
  ), [activeProjectProfile.projectRoot, projectRootEnv, settings.operatorDefaults.projectRoot]);

  const getDefaultEngineRoot = useCallback((nextTarget: O3DETargetConfig | null): string => (
    settings.operatorDefaults.engineRoot
      || activeProjectProfile.engineRoot
      || nextTarget?.engine_root
      || engineRootEnv
  ), [activeProjectProfile.engineRoot, engineRootEnv, settings.operatorDefaults.engineRoot]);

  const loadPromptData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextTarget, capabilityList, sessionList] = await Promise.all([
        fetchO3deTarget().catch(() => null),
        fetchPromptCapabilities(),
        fetchPromptSessions(),
      ]);
      setTargetConfig(nextTarget);
      if (!projectRoot.trim()) {
        setProjectRoot(getDefaultProjectRoot(nextTarget));
      }
      if (!engineRoot.trim()) {
        setEngineRoot(getDefaultEngineRoot(nextTarget));
      }
      setCapabilities(capabilityList);
      setSessions(sessionList);
      if (!selectedPromptId && sessionList[0]) {
        setSelectedPromptId(sessionList[0].prompt_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown prompt-panel error");
    } finally {
      setLoading(false);
    }
  }, [
    engineRoot,
    getDefaultEngineRoot,
    getDefaultProjectRoot,
    projectRoot,
    selectedPromptId,
  ]);

  useEffect(() => {
    const initialProjectRoot = initialProjectRootRef.current;
    const initialEngineRoot = initialEngineRootRef.current;
    let cancelled = false;
    void Promise.all([
      fetchO3deTarget().catch(() => null),
      fetchPromptCapabilities(),
      fetchPromptSessions(),
    ])
      .then(([nextTarget, capabilityList, sessionList]) => {
        if (cancelled) {
          return;
        }
        setTargetConfig(nextTarget);
        if (!initialProjectRoot.trim()) {
          setProjectRoot(getDefaultProjectRoot(nextTarget));
        }
        if (!initialEngineRoot.trim()) {
          setEngineRoot(getDefaultEngineRoot(nextTarget));
        }
        setCapabilities(capabilityList);
        setSessions(sessionList);
        if (sessionList[0]) {
          setSelectedPromptId(sessionList[0].prompt_id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown prompt-panel error");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getDefaultEngineRoot, getDefaultProjectRoot]);

  useEffect(() => {
    if (!selectedPromptId) {
      return;
    }
    let cancelled = false;
    void fetchPromptSession(selectedPromptId)
      .then((session) => {
        if (cancelled) {
          return;
        }
        setSelectedSession(session);
        setSessions((current) => current.map((entry) => (
          entry.prompt_id === session.prompt_id ? session : entry
        )));
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Prompt session detail load failed");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPromptId]);

  useEffect(() => {
    if (!onPlacementProofOnlyReviewChange) {
      return;
    }
    onPlacementProofOnlyReviewChange(
      selectedSession ? summarizePlacementProofOnlyReview(selectedSession) : null,
    );
  }, [onPlacementProofOnlyReviewChange, selectedSession]);

  useEffect(() => {
    if (!promptLaunchDraftRequest) {
      return;
    }
    if (lastPromptLaunchRequestIdRef.current === promptLaunchDraftRequest.requestId) {
      return;
    }
    lastPromptLaunchRequestIdRef.current = promptLaunchDraftRequest.requestId;

    const { draft } = promptLaunchDraftRequest;
    setPromptText(draft.promptText);
    setPreferredDomainsText(draft.preferredDomainsText);
    setOperatorNote(draft.operatorNote);
    suppressNextDryRunDefaultsSyncRef.current = true;
    setDryRun(draft.dryRun);
    setLoadedPromptRecommendation(null);
    setLoadedMissionDraft(draft);
    setLoadedMissionDraftSourceSurfaceLabel(
      promptLaunchDraftRequest.sourceSurfaceLabel?.trim() || "unknown source surface",
    );
    setLoadedMissionDraftLaunchedAtIso(
      promptLaunchDraftRequest.launchedAtIso?.trim() || new Date().toISOString(),
    );
    setLoadedMissionDraftSourceWorkspaceId(
      promptLaunchDraftRequest.sourceWorkspaceId?.trim() || null,
    );
    setPromptRecommendationMessage(`Loaded mission template: ${draft.label}.`);
  }, [promptLaunchDraftRequest]);

  useEffect(() => {
    const previousDefaults = previousOperatorDefaultsRef.current;
    const previousProjectRoot = previousDefaults.projectRoot;
    const previousEngineRoot = previousDefaults.engineRoot;
    const nextProjectRoot = getDefaultProjectRoot(targetConfig);
    const nextEngineRoot = getDefaultEngineRoot(targetConfig);

    if (projectRoot === previousProjectRoot || (!projectRoot && !previousProjectRoot)) {
      setProjectRoot(nextProjectRoot);
    }
    if (engineRoot === previousEngineRoot || (!engineRoot && !previousEngineRoot)) {
      setEngineRoot(nextEngineRoot);
    }
    if (suppressNextDryRunDefaultsSyncRef.current) {
      suppressNextDryRunDefaultsSyncRef.current = false;
    } else if (dryRun === previousDefaults.dryRun) {
      setDryRun(settings.operatorDefaults.dryRun);
    }

    previousOperatorDefaultsRef.current = settings.operatorDefaults;
  }, [
    dryRun,
    engineRoot,
    getDefaultEngineRoot,
    getDefaultProjectRoot,
    projectRoot,
    settings.operatorDefaults,
    targetConfig,
  ]);

  async function handlePreviewPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const request: PromptRequest = {
        prompt_id: crypto.randomUUID(),
        prompt_text: promptText,
        project_root: projectRoot,
        engine_root: engineRoot,
        workspace_id: effectiveWorkspaceId.trim() || null,
        executor_id: effectiveExecutorId.trim() || null,
        dry_run: dryRun,
        preferred_domains: preferredDomainsText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        operator_note: operatorNote.trim() || null,
      };
      const session = await createPromptSession(request);
      setSessions((current) => [session, ...current.filter((entry) => entry.prompt_id !== session.prompt_id)]);
      setSelectedPromptId(session.prompt_id);
      setSelectedSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt session preview failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExecuteSelectedSession() {
    if (!selectedPromptId) {
      return;
    }
    setExecuting(true);
    setError(null);
    try {
      const session = await executePromptSession(selectedPromptId);
      setSelectedSession(session);
      setSessions((current) => current.map((entry) => (
        entry.prompt_id === session.prompt_id ? session : entry
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt session execution failed");
    } finally {
      setExecuting(false);
    }
  }

  function handleLoadPromptRecommendation(recommendation: PromptDraftRecommendation): void {
    setPromptText(recommendation.promptText);
    setPreferredDomainsText(recommendation.preferredDomainsText);
    setOperatorNote(recommendation.operatorNote);
    setDryRun(recommendation.dryRun);
    setLoadedMissionDraft(null);
    setLoadedPromptRecommendation(recommendation);
    setPromptRecommendationMessage(`Loaded recommended prompt template: ${recommendation.label}.`);
  }

  const executeDisabled = !selectedSession
    || !selectedSession.plan?.admitted
    || selectedSession.status === "completed"
    || selectedSession.status === "running"
    || selectedSession.status === "refused";
  const executeLabel = selectedSession && selectedSession.status !== "planned"
    ? "Execute / Continue Selected Prompt"
    : "Execute Selected Prompt";

  return (
    <section style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>Prompt Control</h2>
      <p style={subtleTextStyle}>
        Natural-language prompts compile into admitted typed control-plane steps only. The prompt layer never runs arbitrary shell, Python, or editor commands directly.
      </p>
      <p style={subtleTextStyle}>
        Each prompt-exposed surface carries an explicit safety envelope for state scope, backup, rollback, verification, retention, and natural-language readiness, so broader authoring can widen without hiding what is still blocked or simulated.
      </p>
      <PanelGuideDetails
        tooltip={promptControlGuide.tooltip}
        checklist={promptControlGuide.checklist}
      />
      <p style={subtleTextStyle}>
        Selected project profile: <strong>{activeProjectProfile.name}</strong>
        {" "}using <strong>{activeProjectProfile.projectRoot}</strong>
        {" "}on <strong>{activeProjectProfile.engineRoot}</strong>.
      </p>
      {targetConfig?.project_root || targetConfig?.engine_root ? (
        <p style={subtleTextStyle}>
          Active local target: <strong>{targetConfig.project_root ?? "project unset"}</strong>
          {" "}on{" "}
          <strong>{targetConfig.engine_root ?? "engine unset"}</strong>
          {" "}via {targetConfig.source_label}.
        </p>
      ) : (
        <p style={subtleTextStyle}>
          Live target detection is not available yet. Confirm the project root and
          engine root manually before previewing a prompt plan.
        </p>
      )}
      <article style={recommendationPanelStyle}>
        <div style={recommendationHeaderStyle}>
          <div>
            <strong>Prompt template recommendations</strong>
            <p style={subtleTextStyle}>
              Load a practical starter request from current target and capability context, then edit it before previewing the plan.
            </p>
          </div>
          <span style={recommendationCountStyle}>{promptDraftRecommendations.length} ready</span>
        </div>
        <div style={recommendationGroupStackStyle}>
          {promptDraftRecommendationGroups.map((group) => (
            <section key={group.id} style={recommendationGroupStyle}>
              <div style={recommendationGroupHeaderStyle}>
                <strong>{group.label}</strong>
                <span>{group.description}</span>
              </div>
              <div style={recommendationGridStyle}>
                {group.entries.map((recommendation) => (
                  <article key={recommendation.id} style={recommendationCardStyle}>
                    <strong>{recommendation.label}</strong>
                    <p style={recommendationDetailStyle}>{recommendation.detail}</p>
                    <details style={recommendationDetailsStyle}>
                      <summary style={recommendationSummaryStyle}>Why this template?</summary>
                      <p style={recommendationReasonStyle}>{recommendation.reason}</p>
                      <ul style={recommendationSignalListStyle}>
                        {recommendation.signals.map((signal) => (
                          <li key={signal}>{signal}</li>
                        ))}
                      </ul>
                    </details>
                    <div style={recommendationMetaStyle}>
                      <span>Domains: {recommendation.preferredDomainsText || "planner choice"}</span>
                      <span>Dry run: {recommendation.dryRun ? "preferred" : "off for admitted real path"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadPromptRecommendation(recommendation)}
                    >
                      Use {recommendation.label}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        {promptRecommendationMessage ? (
          <p style={subtleTextStyle}>{promptRecommendationMessage}</p>
        ) : null}
      </article>
      {loadedPromptRecommendation ? (
        <article style={loadedTemplateReviewStyle} aria-label="Loaded template review">
          <div style={loadedTemplateHeaderStyle}>
            <div style={loadedTemplateTitleGroupStyle}>
              <span style={loadedTemplateEyebrowStyle}>Loaded template review</span>
              <strong>{loadedPromptRecommendation.label}</strong>
              <span style={subtleTextStyle}>
                Review these template-filled values, edit anything you need, then preview the prompt plan.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadedPromptRecommendation(null);
                setPromptRecommendationMessage(null);
              }}
            >
              Clear review
            </button>
          </div>
          <div style={loadedTemplateGridStyle}>
            <span>
              Group: <strong>{getPromptRecommendationGroupLabel(loadedPromptRecommendation.group)}</strong>
            </span>
            <span>
              Changed fields: <strong>Prompt text, preferred domains, operator note, dry run</strong>
            </span>
            <span>
              Domains: <strong>{loadedPromptRecommendation.preferredDomainsText || "planner choice"}</strong>
            </span>
            <span>
              Dry run: <strong>{loadedPromptRecommendation.dryRun ? "preferred" : "off for admitted real path"}</strong>
            </span>
          </div>
        </article>
      ) : null}
      {loadedMissionDraft ? (
        <article style={loadedTemplateReviewStyle} aria-label="Mission template handoff review">
          <div style={loadedTemplateHeaderStyle}>
            <div style={loadedTemplateTitleGroupStyle}>
              <span style={loadedTemplateEyebrowStyle}>Mission template handoff</span>
              <strong>{loadedMissionDraft.label}</strong>
              <span style={subtleTextStyle}>
                Review these mission-filled values, edit if needed, preview plan, then execute only within admitted/proof-only boundaries.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadedMissionDraft(null);
                setLoadedMissionDraftSourceSurfaceLabel(null);
                setLoadedMissionDraftLaunchedAtIso(null);
                setLoadedMissionDraftSourceWorkspaceId(null);
                setPromptRecommendationMessage(null);
              }}
            >
              Clear review
            </button>
          </div>
          <div style={loadedTemplateGridStyle}>
            <span>
              Template id: <strong>{loadedMissionDraft.id}</strong>
            </span>
            <span>
              Changed fields: <strong>Prompt text, preferred domains, operator note, dry run</strong>
            </span>
            <span>
              Truth labels: <strong>{loadedMissionDraft.truthLabels.join(", ")}</strong>
            </span>
            <span>
              Dry run: <strong>{loadedMissionDraft.dryRun ? "preferred" : "off for proof-only execution review"}</strong>
            </span>
            <span>
              Loaded from: <strong>{loadedMissionDraftSourceSurfaceLabel ?? "unknown source surface"}</strong>
            </span>
            <span>
              Prefill timestamp (ISO): <strong>{loadedMissionDraftLaunchedAtIso ?? "unknown"}</strong>
            </span>
            <span>
              Source workspace id: <strong>{loadedMissionDraftSourceWorkspaceId ?? "unknown"}</strong>
            </span>
            <span>
              Execution path: <strong>prefill-only; manual preview and explicit execute are still required</strong>
            </span>
          </div>
          <div style={loadedTemplateActionsStyle}>
            <button
              type="button"
              onClick={() => {
                if (loadedMissionDraftSourceWorkspaceId && onReturnToSourceWorkspace) {
                  onReturnToSourceWorkspace(loadedMissionDraftSourceWorkspaceId);
                }
              }}
              disabled={!loadedMissionDraftSourceWorkspaceId || !onReturnToSourceWorkspace}
            >
              Return to source cockpit
            </button>
          </div>
          <p style={subtleTextStyle}>{loadedMissionDraft.guidance}</p>
        </article>
      ) : null}
      <form onSubmit={handlePreviewPlan} style={{ display: "grid", gap: 12 }}>
        <label>
          Prompt text
          <textarea
            title={promptControlPromptTextGuide.tooltip}
            rows={4}
            style={inputStyle}
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            placeholder="Inspect project manifest, capture viewport, and check asset processor status."
          />
        </label>
        <div style={twoColumnGridStyle}>
          <label>
            Project root
            <input
              title={promptControlProjectRootGuide.tooltip}
              style={inputStyle}
              value={projectRoot}
              onChange={(event) => setProjectRoot(event.target.value)}
              placeholder="Saved default or detected local target project root"
            />
          </label>
          <label>
            Engine root
            <input
              title={promptControlEngineRootGuide.tooltip}
              style={inputStyle}
              value={engineRoot}
              onChange={(event) => setEngineRoot(event.target.value)}
              placeholder="Saved default or detected local target engine root"
            />
          </label>
          <label>
            Workspace id
            <input
              title={promptControlWorkspaceIdGuide.tooltip}
              style={inputStyle}
              value={effectiveWorkspaceId}
              onChange={(event) => {
                setWorkspaceIdEdited(true);
                setWorkspaceId(event.target.value);
              }}
            />
          </label>
          <label>
            Executor id
            <input
              title={promptControlExecutorIdGuide.tooltip}
              style={inputStyle}
              value={effectiveExecutorId}
              onChange={(event) => {
                setExecutorIdEdited(true);
                setExecutorId(event.target.value);
              }}
            />
          </label>
        </div>
        <div style={twoColumnGridStyle}>
          <label>
            Preferred domains (comma-separated)
            <input
              title={promptControlPreferredDomainsGuide.tooltip}
              style={inputStyle}
              value={preferredDomainsText}
              onChange={(event) => setPreferredDomainsText(event.target.value)}
              placeholder={preferredDomainsPlaceholder}
            />
          </label>
          <label>
            Operator note
            <input
              title={promptControlOperatorNoteGuide.tooltip}
              style={inputStyle}
              value={operatorNote}
              onChange={(event) => setOperatorNote(event.target.value)}
            />
          </label>
        </div>
        <label style={checkboxStyle}>
          <input
            title={promptControlDryRunGuide.tooltip}
            type="checkbox"
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
          />
          Default child dispatches to dry-run where the admitted capability supports it.
        </label>
        <div style={actionRowStyle}>
          <button
            type="submit"
            title={promptControlPreviewPlanGuide.tooltip}
            disabled={submitting || !promptText.trim() || !projectRoot.trim() || !engineRoot.trim()}
          >
            {submitting ? "Planning..." : "Preview Prompt Plan"}
          </button>
          <button
            type="button"
            title={promptControlRefreshSessionsGuide.tooltip}
            onClick={() => { void loadPromptData(); }}
            disabled={loading}
          >
            Refresh Prompt Sessions
          </button>
          <button
            type="button"
            title={promptControlExecuteSelectedGuide.tooltip}
            onClick={() => { void handleExecuteSelectedSession(); }}
            disabled={executeDisabled || executing}
          >
            {executing ? "Executing..." : executeLabel}
          </button>
        </div>
        {error ? <div style={errorStyle}>{error}</div> : null}
      </form>

      <div style={promptGridStyle}>
        <PromptSessionPanel
          sessions={sessions}
          selectedPromptId={selectedPromptId}
          onSelect={setSelectedPromptId}
        />
        <PromptPlanPanel session={selectedSession} capabilities={capabilities} />
      </div>
      <div style={promptGridStyle}>
        <PromptExecutionTimeline session={selectedSession} />
        <PromptCapabilityPanel capabilities={capabilities} session={selectedSession} />
      </div>
    </section>
  );
}

const panelStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "var(--app-panel-padding)",
  marginBottom: 24,
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: 8,
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  font: "inherit",
} satisfies CSSProperties;

const twoColumnGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
} satisfies CSSProperties;

const promptGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginTop: 16,
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
} satisfies CSSProperties;

const recommendationPanelStyle = {
  display: "grid",
  gap: 12,
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const recommendationHeaderStyle = {
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
} satisfies CSSProperties;

const recommendationCountStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--app-pill-radius)",
  border: "1px solid var(--app-info-border)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const recommendationGroupStackStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const recommendationGroupStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const recommendationGroupHeaderStyle = {
  display: "grid",
  gap: 3,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const recommendationGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
} satisfies CSSProperties;

const recommendationCardStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: "12px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const recommendationDetailStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const recommendationDetailsStyle = {
  padding: "8px 10px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const recommendationSummaryStyle = {
  cursor: "pointer",
  color: "var(--app-text-color)",
  fontSize: 13,
  fontWeight: 700,
} satisfies CSSProperties;

const recommendationReasonStyle = {
  margin: "8px 0 0",
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const recommendationSignalListStyle = {
  margin: "8px 0 0",
  paddingLeft: 18,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const recommendationMetaStyle = {
  display: "grid",
  gap: 4,
  color: "var(--app-muted-color)",
  fontSize: 12,
} satisfies CSSProperties;

const loadedTemplateReviewStyle = {
  display: "grid",
  gap: 12,
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-success-border)",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
} satisfies CSSProperties;

const loadedTemplateHeaderStyle = {
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
} satisfies CSSProperties;

const loadedTemplateTitleGroupStyle = {
  display: "grid",
  gap: 4,
  flex: "1 1 260px",
  minWidth: 0,
} satisfies CSSProperties;

const loadedTemplateEyebrowStyle = {
  color: "var(--app-muted-color)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const loadedTemplateGridStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const loadedTemplateActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const checkboxStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const errorStyle = {
  color: "var(--app-danger-text)",
} satisfies CSSProperties;
