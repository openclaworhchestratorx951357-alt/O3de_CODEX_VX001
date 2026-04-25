# App Operator Guide

<!-- Generated from frontend/src/content/operatorGuideCatalog.json. Do not edit manually. -->

## Overview

Operate the control-plane through focused desktop workspaces instead of one oversized page. The guidebook, desktop labels, and generated operator document all derive from this catalog so instructions stay aligned with the GUI.

- App title: O3DE Agent Control App
- App subtitle: Windows-style control-plane workspace for O3DE operators
- Canonical backend: http://127.0.0.1:8000
- Admitted real: editor.session.open, editor.level.open, editor.entity.create, editor.component.add, editor.component.property.get
- Still bounded: asset execution or mutation beyond admitted slices, render execution or mutation beyond admitted slices, validation execution beyond admitted preflight slices

## How to move through the app

1. Start on Home to refresh the dashboard and orient yourself before dispatching work.
2. Use Prompt Studio for natural-language requests, while keeping simulated versus admitted-real wording explicit.
3. Use Builder when you need repo-native worktree lanes, mission-control visibility, or a clean branch/worktree before handing execution to Codex Desktop.
4. Use Command Center when you need dispatch, approvals, timeline, or agent ownership detail.
5. Use Runtime to validate bridge health, executors, workspaces, and governance posture before claiming real-editor progress.
6. Use Records to inspect runs, executions, artifacts, and evidence before handoff or closeout.

## Tooltip coverage

Hover or focus desktop navigation, launchpad cards, workspace windows, quick stats, and tab strips to read the matching quick-use tip.

- **Approvals**: Shows how many approval decisions are still waiting in Command Center. Open Approvals when this is not clear.
- **Bridge**: Shows whether the editor bridge heartbeat is fresh. Open Runtime Overview when this turns stale or warning.
- **Warnings**: Counts executions that still need operator review. Open Records > Executions to inspect truth markers and evidence.
- **Runs**: Counts unresolved run lanes. Open Records > Runs before closing work or handing off.

## Admitted-real proof checklist

### Confirm canonical target wiring

Start every admitted-real proof run by confirming the backend on http://127.0.0.1:8000 still points at the canonical McpSandbox project, canonical engine root, and canonical editor runner.

#### Endpoints

- GET /o3de/target

#### Commands

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/o3de/target'
```

#### Evidence to confirm

- project_root = C:\Users\topgu\O3DE\Projects\McpSandbox
- engine_root = C:\src\o3de
- editor_runner = C:\Users\topgu\O3DE\Projects\McpSandbox\build\windows\bin\profile\Editor.exe
- runtime_runner matches the editor runner for this local target.
- source_label = repo-configured-local-target

### Confirm the live editor bridge heartbeat

Check the runtime bridge before claiming any editor action is real. The bridge heartbeat must be fresh and must still report the canonical project and engine roots.

#### Endpoints

- GET /o3de/bridge

#### Commands

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/o3de/bridge'
```

#### Evidence to confirm

- heartbeat_fresh = true
- heartbeat.bridge_module_loaded = true
- heartbeat.project_root = C:\Users\topgu\O3DE\Projects\McpSandbox
- heartbeat.engine_root = C:\src\o3de
- Disk evidence exists at C:\Users\topgu\O3DE\Projects\McpSandbox\user\ControlPlaneBridge\heartbeat\status.json
- Disk evidence exists at C:\Users\topgu\O3DE\Projects\McpSandbox\user\ControlPlaneBridge\logs\control_plane_bridge.log

### Read the admitted-real capability map first

Use the prompt capability registry to confirm that editor.session.open, editor.level.open, editor.entity.create, and editor.component.add are admitted on the canonical backend while editor.component.property.get remains an explicit real read-only path.

#### Endpoints

- GET /prompt/capabilities

#### Commands

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/prompt/capabilities'
```

#### Evidence to confirm

- editor.session.open.real_admission_stage = real-editor-authoring-active
- editor.level.open.real_admission_stage = real-editor-authoring-active
- editor.entity.create.real_admission_stage = real-editor-authoring-active
- editor.session.open.safety_envelope.natural_language_status = prompt-ready-approval-gated
- editor.level.open.safety_envelope.natural_language_status = prompt-ready-approval-gated
- editor.entity.create.capability_maturity = real-authoring and editor.entity.create.safety_envelope.natural_language_status = prompt-ready-approval-gated
- editor.component.add.capability_maturity = real-authoring and editor.component.add.real_admission_stage = real-editor-authoring-active
- editor.component.add.allowlisted_parameter_surfaces = ["entity_id", "components", "level_path"]
- editor.component.property.get.capability_maturity = hybrid-read-only and editor.component.property.get.real_admission_stage = real-read-only-active
- editor.component.property.get.allowlisted_parameter_surfaces = ["component_id", "property_path", "level_path"]

### Run the repo-owned live proof command

Use one repo-owned command to prove the admitted prompt-orchestrated editor chain against the canonical backend and write one JSON evidence bundle under backend/runtime.

#### Endpoints

- GET /ready
- GET /o3de/target
- GET /o3de/bridge
- GET /prompt/capabilities
- POST /prompt/sessions
- POST /prompt/sessions/{prompt_id}/execute
- POST /approvals/{approval_id}/approve
- GET /runs/{run_id}
- GET /executions
- GET /artifacts

#### Commands

```powershell
.\backend\runtime\prove_live_editor_authoring.cmd
```

#### Evidence to confirm

- The command writes backend\runtime\live_editor_authoring_proof_<timestamp>.json.
- preflight.bridge.heartbeat_fresh = true and preflight.bridge.heartbeat.bridge_module_loaded = true.
- summary.prompt_session.status = completed and summary.prompt_session.approval_count shows the auto-walked approvals.
- summary.records.run_ids, execution_ids, and artifact_ids are populated for editor.session.open, editor.level.open, editor.entity.create, editor.component.add, and editor.component.property.get.
- summary.bridge_command_ids captures the persistent bridge command ids for all admitted real editor steps.
- summary.safe_level.selected_level_path names a sandbox/test level rather than relying on DefaultLevel.
- summary.entity_name, summary.entity_id, summary.component_id, summary.property_path, and summary.property_value capture the created entity, Mesh attachment, and Controller|Configuration|Model Asset readback.
- summary.cleanup_restore.restore_invoked = true, restore_succeeded = true, and restore_result = restored_and_verified prove file-backed loaded-level restore against the captured backup hash.
- summary.missing_proof still states that live Editor undo, viewport reload, and entity-absence readback were not proven.

### Keep the admitted editor surfaces inside the current narrow boundaries

Treat the live proof, capability map, and composed Prompt Studio review flow as evidence only for the currently admitted editor slices: root-level entity creation, allowlisted component attachment, and explicit read-only component property inspection on the loaded/current level.

#### Endpoints

- GET /prompt/capabilities
- GET /policies

#### Commands

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/prompt/capabilities'
Invoke-RestMethod 'http://127.0.0.1:8000/policies'
```

#### Evidence to confirm

- editor.entity.create is admitted real-authoring through the persistent bridge-backed path on McpSandbox.
- The admitted slice still requires an admitted editor session and a loaded/current level match.
- Only root-level named entity creation is admitted in this slice.
- parent_entity_id, prefab_asset, and position remain rejected on the admitted real path.
- editor.component.add is admitted real-authoring only for explicit entity_id plus allowlisted components Camera, Comment, and Mesh on the loaded/current level.
- editor.component.add still rejects property mutation, removal, parenting, prefab work, and transform placement.
- editor.component.property.get is admitted hybrid read-only only for explicit component_id plus property_path on the loaded/current level.
- Prompt-controlled editor chains may automatically bind the created entity id into editor.component.add and bind the added component id into admitted property readback where the planner has a proven mapping.
- Operator-facing editor-chain review summaries now distinguish requested action, executed action, verified facts, assumptions, missing proof, and safest next step.
- Bounded editor-chain review labels now include succeeded_verified, succeeded_partially_verified, blocked_missing_editor_target, blocked_missing_level, blocked_component_not_allowlisted, failed_runtime_error, and incomplete_readback_unavailable.


## Capability posture

- Simulated versus real wording must remain explicit in both prompts and operator evidence.
- The control-plane repo remains the single orchestration and governance substrate.
- Current admitted-real editor proof remains anchored to the canonical local backend on 127.0.0.1:8000 and the repo-owned backend/runtime/prove_live_editor_authoring.cmd command.
- Current admitted editor-control scope includes real-authoring editor.component.add on its allowlisted surface and hybrid read-only editor.component.property.get on its explicit readback surface.
- The admitted prompt-controlled editor chain may now compose editor.session.open, editor.level.open, editor.entity.create, editor.component.add, and mapped editor.component.property.get readback with automatic result binding and structured post-action review.
- Restore-boundary evidence is operator-visible in run, execution, and artifact detail only as file-backed loaded-level restore evidence; it does not prove live Editor undo, viewport reload, or entity absence.
- Live bridge success currently depends on the project-local ControlPlaneEditorBridge handler path on the active McpSandbox target.

## Key panels

### Dispatch Tool Request

- Location: Command Center > Dispatch
- Quick tip: Use this form when you need an explicit typed request with known agent ownership, tool selection, target wiring, locks, timeout, and args.
- Choose the owning agent before you choose a tool so capability and lock defaults line up.
- Confirm project and engine roots before dispatching to a local O3DE target.
- Keep dry run enabled until you are intentionally crossing into a real or plan-only path.
- Use the response envelope and downstream records after dispatch instead of relying on the form alone.

#### Control tips

- **Agent selector**: Choose the owning agent family before selecting a tool or dispatching the request.
- **Tool selector**: Pick the exact tool path you want to dispatch and check its capability posture in the detail card below.
- **Project root**: Confirm the project root matches the intended local target before dispatch.
- **Engine root**: Confirm the engine root matches the intended local target before dispatch.
- **Locks**: List the control-plane locks required for this request so the run stays inside the intended coordination boundary.
- **Timeout**: Set a realistic timeout for the requested tool instead of leaving an unsafe or misleading default.
- **Args JSON**: Provide only the tool arguments needed for the request and keep simulated versus real expectations explicit in those values.
- **Dry run**: Leave dry run on until you are intentionally requesting a non-simulated path.
- **Dispatch request**: Submit the typed request after agent, tool, target, locks, timeout, and args all match the intended action.

### Last Dispatch Response

- Location: Command Center > Dispatch > Last Dispatch Response
- Quick tip: Use the last dispatch response as the immediate control-plane handoff after a request. It confirms whether the latest call returned success, failure, warnings, or state flags before you switch to persisted records.
- Read the status badge first to distinguish immediate success, failure, or idle state.
- Treat the response as a short-horizon dispatch result and move to Records when you need persisted evidence.
- Keep simulated versus real interpretation explicit when reading result payloads and state flags.

#### Control tips

- **Status badge**: Read the status badge as the immediate dispatch outcome only; it is not a substitute for persisted run or execution evidence.
- **Request summary**: Use the request summary to confirm request ID, timing, and immediate execution interpretation before deeper review.
- **Result payload**: Inspect the result payload when you need the raw returned fields from the latest dispatch.
- **Error payload**: Inspect the error payload to confirm code, message, retryability, and any structured details from the latest dispatch.
- **State flags**: Use the state flags to see whether the latest dispatch reported dirty, save, reconfigure, rebuild, or asset follow-up requirements.
- **Warnings, logs, and artifacts**: Review warnings, logs, and artifacts here before switching to the persisted records that track the same dispatch outcome.

### Agent Control

- Location: Command Center > Agents
- Quick tip: Use Agent Control to confirm which agent family owns a lane, what locks it commonly works under, and which tools it is expected to coordinate.
- Read the role and owned tools before assuming an agent should receive a request.
- Check the lock label when explaining coordination boundaries or blocked work.
- Treat this surface as ownership guidance, not as runtime proof of tool admission.

#### Control tips

- **Agent cards**: Review each agent card to confirm ownership, coordination locks, and the tool lane it is expected to manage.

### System Status

- Location: Runtime > Overview
- Quick tip: Use System Status for backend readiness, persistence posture, schema coverage, and live editor bridge diagnostics before making runtime claims.
- Read the Editor Bridge card before claiming the bridge is live or stale.
- Use Backend, Persistence, and Schema Validation cards to separate health issues from capability or coverage issues.
- Treat bridge telemetry as diagnostics only and not as proof that excluded tools became admitted real.

#### Control tips

- **Clear stale success results**: Use this only to remove stale successful bridge transport artifacts; it does not delete deadletters.
- **Copy deadletter follow-up draft**: Copy a browser-local follow-up draft for recent deadletters without creating new backend persistence.

### Operator Overview

- Location: Home > Operator Overview
- Quick tip: Use Operator Overview for a compact persisted summary of approvals, runs, executions, artifacts, events, locks, executors, and workspace pressure before handoff or closeout.
- Refresh overview first when the home workspace may be stale.
- Use the status chips as filter shortcuts into the deeper workspaces instead of treating them as the full investigation surface.
- Read pinned-lane actions and review posture before you summarize work as complete.

#### Control tips

- **Refresh overview**: Refresh the home overview when the persisted aggregate may be stale.
- **Status filter chips**: Use the status chips to jump into the matching run, approval, execution, artifact, event, executor, or workspace lane.
- **Lane actions**: Use the pinned-lane actions to refocus, clear, recover, annotate, or filter the current operator lane.

### Attention Recommendations

- Location: Home > Operator Overview > Attention Recommendations
- Quick tip: Use Attention Recommendations for browser-local suggestions about what the operator should inspect next based on current review memory and persisted records.
- Treat these recommendations as frontend guidance, not backend orchestration output.
- Use the recommendation detail to decide which workspace or record deserves focus first.
- Open the suggested lane before assuming the recommendation is still current.

#### Control tips

- **Recommendation cards**: Read each recommendation card for the local suggestion label, why it surfaced, and what the browser session thinks needs attention next.
- **Recommendation actions**: Use the recommendation actions to jump directly into the suggested lane or its secondary follow-up.

### Review Queue

- Location: Home > Operator Overview > Review Queue
- Quick tip: Use Review Queue to reopen the highest-priority browser-local execution and artifact contexts that still need operator review.
- Read the focus label and priority detail before reopening a saved context.
- Use the queue as a browser-session review aid only; it does not persist server-side triage.
- Mark, snooze, or keep entries in queue so the home overview reflects your actual review state.

#### Control tips

- **Queue entry cards**: Review each queue entry for lane, priority, saved context, and the next suggested check before taking action.
- **Open saved context**: Use Open saved context to restore the selected browser-local review lane before you act on it.
- **Triage actions**: Use the triage actions to open follow-up detail, mark reviewed, snooze, or return an entry to the active queue.

### Workspace Memory

- Location: Home > Operator Overview > Workspace Memory
- Quick tip: Use Workspace Memory to manage browser-local saved overview contexts, notes, and review disposition without creating backend persistence.
- Read the lane and origin badges before reopening an old saved context.
- Use notes and review actions to keep local handoff memory truthful and current.
- Clear stale entries when they no longer match the current operator lane.

#### Control tips

- **Clear all presets**: Use Clear all local context presets only when the current browser-session memory is stale or no longer useful.
- **Open saved context**: Use Open saved context to restore the selected browser-local memory entry.
- **Local review actions**: Use the local review actions to triage, mark reviewed, snooze, or return the memory entry to queue.
- **Note editor**: Use the note editor to save a browser-local note for this memory entry.
- **Clear saved context**: Use Clear saved context to remove a single stale browser-local memory entry.

### Active Overview Context

- Location: Records/Runtime > Active Overview Context
- Quick tip: Use Active Overview Context to keep track of which lane is currently being driven from a home-overview drilldown or browser-local preset.
- Read the active focus and origin before assuming the current lane opened itself naturally.
- Use local preset and history controls to keep browser-session navigation memory deliberate.
- Clear stale focus when the overview-driven context no longer matches the current investigation.

#### Control tips

- **History entries**: Use the history entries to replay recent overview-driven contexts from this browser session.
- **Preset actions**: Use the preset actions to save, reapply, or clear browser-local overview presets.
- **Clear focus**: Use Clear overview context when you want the current lane to stop following the active overview drilldown.

### Closeout Readiness

- Location: Home > Operator Overview > Closeout Readiness
- Quick tip: Use Closeout Readiness for a browser-local check of which saved contexts look ready for handoff versus still needing follow-up.
- Read the ready versus follow-up counts before you summarize session closeout posture.
- Treat this as a frontend readiness aid only, not backend workflow truth.
- Use entry detail to understand why a saved context still looks incomplete.

#### Control tips

- **Readiness entries**: Review each readiness entry for lane, focus, summary label, and the local reason it is ready or still pending.

### Handoff Confidence

- Location: Home > Operator Overview > Handoff Confidence
- Quick tip: Use Handoff Confidence for a browser-local risk summary of whether the current handoff draft looks strong, cautionary, or risky.
- Read the confidence label together with stale, drifted, excluded, and changed-since-snapshot counts.
- Treat this as a local operator cue only and not as backend policy or approval state.
- Use it to decide whether a handoff needs another review pass before export.

#### Control tips

- **Confidence summary**: Use the confidence summary to judge whether the current browser-local handoff posture is high-confidence, cautionary, or risky.

### Handoff Export Draft

- Location: Home > Operator Overview > Handoff Export Draft
- Quick tip: Use Handoff Export Draft to preview and copy the browser-local operator handoff text built from the current saved contexts.
- Read included and excluded counts before copying the draft.
- Treat the draft as browser-local preview text only; it is not backend-persisted handoff state.
- Use the draft preview to sanity-check provenance and readiness language before sharing it.

#### Control tips

- **Copy handoff draft**: Use Copy handoff draft to place the current browser-local handoff text on the clipboard.
- **Draft preview**: Inspect the draft preview to confirm the exact handoff text that would be copied from the current browser session.

### Local Handoff Package Preview

- Location: Home > Operator Overview > Local Handoff Package Preview
- Quick tip: Use Local Handoff Package Preview to see which saved contexts would currently be included or excluded from a strong browser-local handoff package.
- Read the included and excluded counts before deciding the handoff is ready.
- Use provenance detail to explain why an entry is included now or still excluded for follow-up.
- Treat this package preview as browser-local operator guidance only.

#### Control tips

- **Package entry cards**: Review each package entry card to see whether that saved context is included now or excluded pending follow-up.

### Review Session Summary

- Location: Home > Operator Overview > Review Session Summary
- Quick tip: Use Review Session Summary to inspect browser-local counts for in-queue, snoozed, reviewed, stale, and drifted saved contexts.
- Read the queue and drift counts before assuming the local review session is healthy.
- Use snapshot and compare labels to understand how the session changed over time.
- Use the session actions carefully because they affect browser-local review state for all saved contexts.

#### Control tips

- **Session actions**: Use the session actions to copy a session snapshot, return all entries to queue, or clear the browser-local review state.

### Prompt Control

- Location: Prompt Studio > Prompt Control
- Quick tip: Use Prompt Control to turn natural-language requests into admitted typed plans, select prompt context, and continue eligible prompt sessions without losing truth markers.
- State the prompt clearly, then confirm project and engine roots before previewing a plan.
- Keep admitted-real, blocked, refused, and simulated implications explicit when reading prompt output.
- Use Preview Prompt Plan first, then continue execution only when the selected prompt session is actually admitted and ready.

#### Control tips

- **Prompt text**: Describe the intended operator task in natural language while keeping expectations truthful about admitted, refused, or blocked capability.
- **Project root**: Confirm the project root matches the intended local target before compiling a prompt plan.
- **Engine root**: Confirm the engine root matches the intended local target before compiling a prompt plan.
- **Workspace id**: Provide a workspace ID when the prompt should continue inside a specific persisted workspace context.
- **Executor id**: Provide an executor ID when the prompt should target a specific executor context.
- **Preferred domains**: Use preferred domains to steer planning toward the intended admitted capability families.
- **Operator note**: Use the operator note to capture short operator intent or caution that should travel with the prompt session.
- **Dry run**: Leave dry run enabled when you want prompt-generated child steps to prefer dry-run where the admitted capability supports it.
- **Preview prompt plan**: Use Preview Prompt Plan to compile the natural-language request into a persisted admitted typed plan without immediately continuing execution.
- **Refresh prompt sessions**: Refresh Prompt Sessions when the prompt workspace may be stale or another action changed the selected session.
- **Execute selected prompt**: Continue the selected prompt session only when its admitted plan is ready and the current status allows progress.

### Prompt Sessions

- Location: Prompt Studio > Prompt Sessions
- Quick tip: Use Prompt Sessions to select the persisted prompt run you want to inspect, continue, or explain.
- Read status, prompt text, and summary together before choosing a session.
- Treat the list as prompt-session selection, then use the adjacent panels for plan, timeline, and capability detail.
- Keep admitted versus refused capability interpretation explicit when reading session summaries.

#### Control tips

- **Session entries**: Select a prompt session entry to inspect that prompt's persisted plan, timeline, and capability posture.

### Prompt Plan

- Location: Prompt Studio > Prompt Plan
- Quick tip: Use Prompt Plan to inspect the admitted typed plan, refused capabilities, safety envelopes, and step arguments produced from a natural-language prompt.
- Read admitted status, summary, and refusal reason before scanning step detail.
- Use step cards to understand approval class, capability posture, safety envelope, and dependencies for each typed step.
- Keep missing or blocked safety metadata explicit instead of assuming broader readiness.

#### Control tips

- **Plan summary card**: Use the plan summary card for admitted status, overall summary, and any refusal reason.
- **Step cards**: Read each step card to inspect tool, agent, approval class, capability posture, safety envelope, and dependency chain.
- **Step args JSON**: Inspect the step args JSON when you need the exact typed argument payload produced by the planner.

### Prompt Capability Registry

- Location: Prompt Studio > Prompt Capability Registry
- Quick tip: Use Prompt Capability Registry to inspect which typed capabilities the prompt front door can resolve to, including maturity, admission stage, and natural-language safety posture.
- Read capability status, maturity, and real admission stage together before describing what prompting can do.
- Use relevant capability entries to explain why a tool is admitted, gated, blocked, or excluded.
- Keep missing safety-envelope metadata explicit when the backend omits it.

#### Control tips

- **Capability entries**: Read each capability entry for typed tool identity, agent family, maturity, admission stage, safety posture, and allowlisted parameters.

### Prompt Execution Timeline

- Location: Prompt Studio > Prompt Execution Timeline
- Quick tip: Use Prompt Execution Timeline to inspect prompt-session status, step attempts, latest child responses, and child record lineage.
- Read the session summary first to understand status, current step, approval pause, and the latest result summary.
- Use step attempts and child responses when diagnosing prompt continuation or retry behavior.
- Use child lineage lists to pivot into the underlying runs, executions, artifacts, or events.

#### Control tips

- **Session summary card**: Use the session summary card for current prompt status, workspace, executor, approval pause, and high-level outcome detail.
- **Step attempts**: Use step attempts to see how many times each typed prompt step has been tried.
- **Child lineage groups**: Use the child lineage groups and latest child responses to inspect the runs, executions, artifacts, and events created by the prompt session.

### Runs

- Location: Records > Runs
- Quick tip: Use Runs for lineage, unresolved work, audit status, and run-level truth before drilling into execution or artifact detail.
- Filter first when you are investigating settings.patch or a specific audit state.
- Use search to narrow by run ID, tool, agent, or summary before opening detail.
- Open run detail only after the list view has narrowed to the lane you actually want.

#### Control tips

- **Refresh runs**: Refresh only the runs lane when the persisted run list may be stale.
- **Run search**: Search runs by tool, agent, run ID, or summary without leaving the records workspace.
- **Tool filter**: Use the tool filter to isolate all runs or only settings.patch runs.
- **Audit filter**: Use the audit filter to narrow runs by preflight, blocked, succeeded, rolled back, or other audit outcomes.
- **View run detail**: Open the selected run when you are ready to inspect the full run-level detail pane.

### Executions

- Location: Records > Executions
- Quick tip: Use Executions to inspect persisted execution warnings, provenance, mutation audit status, and linked runtime ownership data.
- Search down to the relevant execution before reviewing warning counts or provenance.
- Check execution mode, provenance, and mutation audit status together before you claim an outcome is real.
- Open execution detail when the list row shows the lane you need.

#### Control tips

- **Refresh executions**: Refresh only the execution lane when the persisted execution list may be stale.
- **Execution search**: Search executions by tool, agent, run ID, or summary without leaving the records workspace.
- **View execution detail**: Open the selected execution when you need the full persisted execution detail panel.

### Artifacts

- Location: Records > Artifacts
- Quick tip: Use Artifacts to inspect output provenance, simulation markers, evidence completeness, and mutation audit posture before sharing results.
- Search to the artifact you care about before reviewing evidence or path details.
- Check simulated, execution mode, provenance, and evidence completeness together.
- Open artifact detail before handoff when a file or output claim matters.

#### Control tips

- **Refresh artifacts**: Refresh only the artifact lane when persisted artifact records may be stale.
- **Artifact search**: Search artifacts by label, kind, path, URI, project, or record ID.
- **View artifact detail**: Open the selected artifact when you need the full evidence and metadata detail panel.

### Approval Queue

- Location: Command Center > Approvals
- Quick tip: Use Approval Queue to resume or reject capability-gated work while keeping the real boundary narrow and explicit.
- Search by tool, agent, run, class, or reason before deciding.
- Read the reason and meaning notes before you approve or reject a queued action.
- After a decision, revisit the affected run or execution in Records.

#### Control tips

- **Refresh approvals**: Refresh only the approval queue when queued decisions may have changed.
- **Approval search**: Search approvals by tool, agent, run, class, or reason.
- **Approve decision**: Approve only when the queued action matches the intended capability and target posture.
- **Reject decision**: Reject when the queued action is unsafe, out of scope, or mismatched to the intended target or capability.

### Task Timeline

- Location: Command Center > Timeline
- Quick tip: Use Task Timeline to reconstruct persisted event flow across runs, executions, executors, and workspaces.
- Search by message, category, state, or linked record before reading the full list.
- Use timeline meaning notes to separate capability posture from routine event noise.
- Open linked records when the event row shows the run, execution, executor, or workspace you need.

#### Control tips

- **Refresh events**: Refresh only the timeline lane when event history may be stale.
- **Timeline search**: Search timeline events by message, run, category, state, or capability.
- **Open linked record**: Use the inline record buttons to jump directly to the related run, execution, executor, or workspace.

### Tools Catalog

- Location: Command Center > Dispatch
- Quick tip: Use Tools Catalog to confirm which agent family owns a tool, what approval class it carries, and how its capability is described before dispatching anything.
- Read the owning agent family before assuming a tool belongs on the current lane.
- Check approval class, capability, meaning, and risk together before dispatch.
- Treat the catalog as the read-only capability map for the current control-plane build.

#### Control tips

- **Agent family rows**: Read each agent family row to confirm tool ownership and role before dispatching work.
- **Tool entries**: Review each tool entry for approval class, capability meaning, and risk before you choose it.

### Adapter Registry

- Location: Runtime > Overview
- Quick tip: Use Adapter Registry to confirm configured mode, contract version, family readiness, and which paths are real, plan-only, or still simulated.
- Read the registry summary before making any claim about the current adapter boundary.
- Check path rollup to separate real, plan-only, and simulated tool paths.
- Review family cards when a specific adapter family or execution boundary is in question.

#### Control tips

- **Registry summary card**: Use Registry Summary for the top-level configured mode, contract, and boundary posture.
- **Path rollup card**: Use Path Rollup to compare real tool paths, plan-only paths, and still-simulated paths.
- **Adapter family cards**: Use the family cards to inspect per-family readiness, execution boundary, and path ownership.

### Executors

- Location: Runtime > Executors
- Quick tip: Use Executors to inspect persisted executor inventory, availability, execution-mode class, and supported runner families before routing work.
- Search down to the executor you care about before comparing availability or host posture.
- Read execution mode class and availability together before claiming a lane is ready for real or simulated work.
- Open executor detail when you need linked workspace, execution, run, or artifact context.

#### Control tips

- **Refresh executors**: Refresh the executor inventory when persisted availability or heartbeat metadata may be stale.
- **Executor search**: Search executors by ID, label, host, kind, or runner family without leaving the runtime workspace.
- **View executor detail**: Open the selected executor when you need the full linked-record and handoff detail view.

### Executor Detail

- Location: Runtime > Executors > Executor Detail
- Quick tip: Use Executor Detail to inspect one persisted executor record with local handoff state, capability snapshot, lifecycle, and linked runtime records.
- Read local handoff state before assuming the executor is ready for closeout or review.
- Use executor identity, lifecycle, and capability snapshot together when diagnosing drift or availability claims.
- Open linked workspaces, executions, runs, or artifacts from here when the executor needs deeper record follow-up.

#### Control tips

- **Refresh executor detail**: Refresh the selected executor detail without leaving the executors lane.
- **Saved context button**: Use Open saved context to restore the browser-local executor review context for this lane.
- **Local review actions**: Use the local review actions to mark reviewed, snooze, or return the executor to the local queue.
- **Related record buttons**: Use the related record buttons to open the first linked workspace, execution, run, or artifact from the executor view.

### Workspaces

- Location: Runtime > Workspaces
- Quick tip: Use Workspaces to inspect persisted workspace isolation, ownership, lifecycle, and runner-family inventory before assuming a target is attached and ready.
- Search down to the relevant workspace before comparing state, owner, or cleanup posture.
- Read workspace state, runner family, and owner records together before claiming a project surface is ready.
- Open workspace detail when you need full bindings, lifecycle, and linked record context.

#### Control tips

- **Refresh workspaces**: Refresh the workspace inventory when persisted lifecycle or ownership data may be stale.
- **Workspace search**: Search workspaces by ID, root, state, runner family, or owner without leaving the runtime workspace.
- **View workspace detail**: Open the selected workspace when you need the full workspace detail pane.

### Locks

- Location: Runtime > Governance > Locks
- Quick tip: Use Locks to inspect active persisted control-plane lock ownership before dispatching new work or explaining why a lane is blocked.
- Read the lock name and owning run together before you claim a lane is blocked by policy or activity.
- Treat these records as control-plane coordination evidence, not as proof that a tool path became admitted real.
- Move to the owning run in Records when a lock needs deeper investigation.

#### Control tips

- **Lock records**: Review each lock record to confirm the lock name, owner run, and creation time before escalating coordination issues.

### Policies

- Location: Runtime > Governance > Policies
- Quick tip: Use Policies to inspect approval class, capability status, admission stage, lock requirements, risk, and execution mode for each governed tool surface.
- Search to the relevant tool or agent before comparing approval or capability posture.
- Read capability status, admission stage, and execution mode together before making any admitted-real claim.
- Use required locks and next requirement when explaining why a tool remains simulated, plan-only, or approval-gated.

#### Control tips

- **Policy search**: Search policies by tool, agent, capability, risk, or required locks without leaving governance.
- **Policy entries**: Read each policy entry as the governed truth for approval class, capability posture, and next requirement.

### Run Detail

- Location: Records > Runs > Run Detail
- Quick tip: Use Run Detail to inspect one persisted run with its lineage, truth boundary, locks, warnings, prompt safety, restore-boundary evidence, and any available mutation or evidence follow-through.
- Start with lineage and triage summary before jumping deeper into evidence.
- Use the truth boundary section to keep simulated versus admitted-real wording accurate.
- When Editor Restore Boundary appears, treat it as file-backed loaded-level restore evidence only, not proof of live Editor undo, viewport reload, or entity absence.
- Refresh the selected run detail when related execution evidence may have changed.

#### Control tips

- **Refresh run detail**: Refresh the selected run detail and related execution evidence without leaving the detail lane.
- **Lineage open buttons**: Use the lineage buttons to jump to the linked run, execution, or artifact from the current record context.
- **Jump action**: Use the jump action to move directly to the most important truth-boundary, mutation-audit, or evidence section.
- **Record navigation buttons**: Use the navigation buttons to reopen breadcrumbs, related records, or the origin artifact without leaving the detail workflow.

### Execution Detail

- Location: Records > Executions > Execution Detail
- Quick tip: Use Execution Detail to inspect one persisted execution with lineage, truth markers, prompt safety, restore-boundary evidence, related artifacts, and evidence when available.
- Read lineage and triage summary before reviewing artifact follow-through.
- Use execution truth markers and prompt safety together before describing the outcome.
- Use Editor Restore Boundary status and hash fields only when the execution details include restore_boundary_id.
- Refresh the execution detail when related artifact records may have changed.

#### Control tips

- **Refresh execution detail**: Refresh the selected execution and related artifact context without leaving the detail lane.
- **Lineage open buttons**: Use the lineage buttons to open the linked run or artifact from the current execution context.
- **Jump action**: Use the jump action to move directly to related records or evidence, depending on what this execution currently exposes.
- **Record navigation buttons**: Use these buttons to reopen related artifacts, breadcrumbs, or origin context without leaving the detail workflow.

### Artifact Detail

- Location: Records > Artifacts > Artifact Detail
- Quick tip: Use Artifact Detail to inspect one persisted artifact with lineage, provenance markers, prompt safety, restore-boundary evidence, sibling artifacts, and next-hop guidance.
- Read lineage and triage summary before deciding whether to move back to execution or run context.
- Check artifact truth markers and prompt safety together before sharing or promoting output.
- Do not promote restore-boundary metadata into cleanup or reversibility claims unless restore_invoked and restore_succeeded are both true.
- Refresh the selected artifact when related records may have changed.

#### Control tips

- **Refresh artifact detail**: Refresh the selected artifact detail without reloading unrelated sections.
- **Lineage open buttons**: Use the lineage buttons to jump back to the related run, execution, or current artifact context.
- **Jump action**: Use the jump action to move directly to sibling records or evidence when that is the fastest route to the relevant proof.
- **Next hop buttons**: Use the next-hop buttons to move from artifact context back to the closest execution or broader run context.
- **Record navigation buttons**: Use these buttons to reopen breadcrumbs or sibling artifacts without leaving the detail workflow.

### Workspace Detail

- Location: Runtime > Workspaces > Workspace Detail
- Quick tip: Use Workspace Detail to inspect persisted workspace substrate bookkeeping, local handoff state, ownership, bindings, lifecycle, and linked records.
- Read local handoff state before assuming the workspace is ready for closeout or review.
- Use identity, ownership, and lifecycle together when diagnosing workspace drift or cleanup state.
- Open related executions, runs, or artifacts from here when the workspace needs deeper record follow-up.

#### Control tips

- **Refresh workspace detail**: Refresh the selected workspace detail without leaving the workspaces lane.
- **Saved context button**: Use Open saved context to restore the browser-local workspace review context for this lane.
- **Local review actions**: Use the local review actions to mark reviewed, snooze, or return the workspace to the local queue.
- **Related record buttons**: Use the related record buttons to open the first linked execution, run, or artifact from the workspace view.


## Home
Home is the orientation and launch surface. Use it whenever you need the broadest picture of operator posture before drilling into a focused lane.
### Operator checklist
- Refresh the dashboard when you need a current top-level read of approvals, warnings, runs, and bridge health.
- Use Launchpad to move into a purpose-built workspace instead of staying on a continuous scrolling surface.
- Review Operator Overview before handoff, when warnings climb, or when lane memory needs a quick sanity check.
- Keep the Guidebook nearby while onboarding or when a surface has not been used recently.
### Windows
#### Mission Control
- High-level operator shell controls, lane memory, and refresh entry points.
- Quick tip: Refresh dashboard state, inspect pinned lane context, and recover the operator's current working posture from one place.
- Use the refresh actions first when you suspect the desktop is stale.
- Review pinned record, lane memory, and recovery controls before reopening work on an existing run.
- Save lane notes here when you need continuity between sessions or handoffs.
#### Launchpad
- Open focused workspaces instead of hunting through one continuous operator page.
- Quick tip: Jump directly into Prompt Studio, Builder, Command Center, Runtime, or Records with the workspace preselected for the intended task.
- Use Launchpad as the fastest route into a specific workflow.
- Pick Prompt Studio for natural-language requests, Builder for worktree lanes and mission control, Command Center for dispatch and approvals, Runtime for bridge health, and Records for evidence review.
- Treat Launchpad as navigation, not as a substitute for the deeper workspace itself.
#### Operator Overview
- Attention queue, handoff posture, and browser-local review memory.
- Quick tip: Check the attention queue and review posture here before assuming a lane is ready to close or hand off.
- Use this window to see what needs attention next.
- Confirm handoff readiness here before you summarize work for another operator or agent.
- Use it as the final stop before closing the session if warnings or unresolved items remain.
#### Operator Guidebook
- In-app instructions, capability posture, and workspace-by-workspace usage notes.
- Quick tip: Read the whole desktop runbook inside the app. This mirrors the generated operator guide document.
- Use the guidebook while onboarding or after layout changes.
- Check the capability posture section before describing admitted-real scope to others.
- If the app changes, update this catalog first so the guidebook and generated docs stay synchronized.
## Prompt Studio
Prompt Studio is the operator-facing natural-language front door. It is where planning and controlled dispatch begin, not where evidence review ends.
### Operator checklist
- Choose the correct workspace and executor context before sending a prompt.
- State whether you expect planning, simulated output, or an admitted-real action path.
- Review the response envelope and spawned record IDs after each dispatch.
### Launchpad shortcut

- **Prompt Studio**: Natural-language planning and admitted typed execution paths.
- Open Prompt Studio when you want to work through the app in natural language while preserving truth markers.

### Windows
#### Prompt Studio
- Natural-language control surface with explicit admitted-real versus simulated guardrails.
- Quick tip: Draft prompts, choose execution context, and review the resulting response envelope without losing truth labels.
- Use this workspace for natural-language task entry and controlled dispatch.
- Keep simulated versus admitted-real wording explicit in both the request and your interpretation of the result.
- Open related runs, executions, and artifacts afterward in Records when you need persisted evidence.
## Builder
Builder is the app-native branch, worktree, mission-control, and inbox workspace. Use it when you need to spin up a clean lane, seed shared coordination tasks, sync worker state, publish heartbeats, review app-owned objectives/jobs/observations, check what other threads own, or prepare a stable handoff into Codex Desktop without colliding on ports or stale local state.
### Operator checklist
- Check the harness and repo status first so you know whether the workspace is in manual-handoff mode or missing mission-control wiring.
- Inspect worktrees and mission-control ownership before creating a new lane for another thread.
- Use lane creation and task seeding here instead of ad hoc worktree commands so the shared board stays truthful.
- Use task claim, wait, and notification controls here before assigning overlapping scope to another thread.
- Refresh worker status and copy the handoff package here before moving work into a new Codex thread.
- Use the Autonomy Inbox window to review queued helper jobs and copy a manual inbox-check prompt for the next thread.
### Launchpad shortcut

- **Builder**: Worktree lanes, branch creation, and mission-control visibility for Codex Desktop handoffs.
- Open Builder when you need a clean branch/worktree lane or want to see whether another thread already owns the scope.

### Windows
#### Builder Overview
- Repo root, current branch, harness readiness, and manual-handoff truth.
- Quick tip: Use this window to confirm what builder surfaces are ready now and what still remains a future automation phase.
- Read the manual-handoff note before assuming the app is already driving Codex Desktop autonomously.
- Confirm repo root, git common dir, and current branch before launching new worktree lanes.
- Use the notes here as the truth source for what this builder slice does and does not automate yet.
#### Worktree Lanes
- Current git worktrees, attached branches, and lock/collision posture.
- Quick tip: Inspect every attached worktree here before assigning new work so threads do not pile onto the same checkout.
- Check which branch is already attached to each worktree before starting another thread.
- Use the current-repo marker to distinguish the main checkout from side lanes.
- Treat locked or detached worktrees as signals to inspect first instead of reusing blindly.
#### Mission Board
- Shared workers, tasks, waiters, and notifications from the repo mission-control state.
- Quick tip: Use the live board snapshot to see who owns what, who is waiting on blocked scope, and when an urgent supersede should replace the selected lane's current task.
- Check worker ownership before you tell another thread to start on a file or scope.
- Use task claim, release, complete, and wait controls here instead of relying on private shell notes.
- Use Supersede current task here when higher-priority work must replace the selected lane's active task, optionally stop its managed terminal, and publish the override on the shared board in one repo-owned step.
- Use notifications and waiters to spot queued work instead of duplicating effort.
- If the board is missing, seed or refresh a lane before relying on multi-thread coordination.
#### Create Lane
- Launch a new branch/worktree lane and seed coordination tasks from the in-app control surface.
- Quick tip: Use the lane and task forms to create a clean branch/worktree pair and register shared scope on the mission-control board in one step.
- Keep worker ID short and stable so lane ownership is readable in the board snapshot.
- Leave optional paths blank unless you need a specific branch name or worktree location.
- Seed shared tasks here when a follow-on thread needs an explicit scope claim before starting work.
- Refresh the board after creation and hand the new lane to the next Codex thread instead of reusing the current checkout.
#### Worker Lifecycle
- Sync worker lanes, publish heartbeats, and generate copy-ready handoff packages.
- Quick tip: Use this window to keep the shared board truthful for each worker lane and prepare a stable handoff package for the next Codex thread.
- Use worker sync when a lane exists but its branch, worktree, status, or summary needs to be refreshed on the shared board.
- Use heartbeat when you need to publish a current worker state update without creating a new lane.
- Generate and copy the handoff package here before switching threads so the next operator starts from the same board truth.
- Treat this as coordination scaffolding for Codex Desktop, not as a self-prompting autonomous loop.
#### Worker Terminals
- Managed worker processes with captured logs, stop controls, and urgent interrupt actions.
- Quick tip: Use this window when a worker lane needs one observable repo-launched process with log capture and an operator-visible stop path.
- Launch only repo-owned commands here so the app can capture logs, show status, and stop the process again safely.
- Treat these as managed worker processes, not as proof that the app can directly control arbitrary Codex chat threads.
- Use Interrupt selected worker here when higher-priority work must preempt a lane and the selected managed terminal should stop immediately.
- Use the Mission Board supersede flow when you need the task reassignment itself to happen in the same repo-owned step as the interrupt, instead of only broadcasting that the lane should stop.
#### Autonomy Inbox
- Manual helper-thread queue for Builder objectives, jobs, observations, and reusable memory.
- Quick tip: Use this window to keep a durable Builder inbox inside the app and generate a copy-ready prompt telling the next thread exactly how to check it.
- Use the inbox summary cards to see whether there are active objectives, queued jobs, or warning observations before assigning another thread.
- Seed new objectives and jobs here when you want work to stay visible in the app instead of living only in ad hoc chat history.
- Promote or claim an inbox job here when it is ready to become a concrete mission-board task for a selected worker lane.
- Mark inbox jobs running, blocked, or succeeded here so Builder status stays aligned with the mission board.
- Use Wait on linked task or Release linked task here when a Builder inbox job is blocked on ownership or needs to go back to the shared queue without leaving the app.
- If a promote or claim step fails here, Builder now records an observation and a proposed healing action so the next thread can see the blocker immediately.
- Mark observations handled and resolve healing actions here to close the loop when a stuck-thread blocker has been reviewed or cleared.
- Watch the stuck-thread signal pills here for stale blockers, stale worker heartbeats, retry exhaustion, and already-pending refresh requests before sending more traffic.
- Use the refresh ping from Builder when one lane needs another thread to re-check its worktree, mission-board task, or blocker state without resorting to constant polling.
- Copy the inbox prompt here when you want the next Codex thread to inspect Builder, respect mission-board ownership, and help manually.
- Treat this as operator-guided coordination and memory, not as proof of autonomous self-prompting behavior.
## Command Center
Command Center is the operational workbench. Use it when a task requires structured dispatch, approvals, or a read on ownership and event flow.
### Operator checklist
- Start on Dispatch when you need the catalog, adapters, and response envelope in one surface.
- Move to Agents when clarifying ownership or tool lanes.
- Clear Approvals before claiming a task is complete if the queue still shows pending decisions.
- Use Timeline to reconstruct what happened across related records.
### Launchpad shortcut

- **Command Center**: Catalog browsing, dispatch, approvals, and live timeline control.
- Open Command Center when you need explicit dispatch and control-plane coordination instead of free-form prompting.

### Windows
#### Command Center
- Work through dispatch, agents, approvals, and timeline without leaving the operator desktop.
- Quick tip: Use the tab strip to stay inside the same operational workspace while moving between dispatch, agents, approvals, and timeline.
- Stay in this workspace when you are actively coordinating a task.
- Use the tab strip instead of bouncing between unrelated windows.
- Treat Command Center as the queue-and-control lane for operator action.
### Surfaces and tabs

#### Dispatch

- Catalog, typed dispatch, and latest response envelope.
- Quick tip: Browse the catalog, inspect adapters, dispatch a request, and review the latest response envelope in one place.
- Start here when you need a structured request instead of free-form prompting.
- Use the catalog and adapters to confirm the target surface before dispatch.
- Review the response envelope before moving to Records for persisted evidence.

#### Agents

- Available operator families and owned tool lanes.
- Quick tip: Use this tab to inspect which agent family owns which lane before dispatching work or assuming capability.
- Open Agents when ownership is unclear.
- Use the listed tool lanes to avoid dispatching to the wrong family.
- Treat this as a capability map, not as a runtime proof surface.

#### Approvals

- Pending decisions on the control-plane queue.
- Quick tip: Resolve queued approval requests here before claiming a task is unblocked or complete.
- Use this tab whenever the approvals counter is non-zero.
- Resolve or reject decisions with current context in hand.
- After approval work, recheck affected runs and executions in Records.

#### Timeline

- Cross-record event and task history.
- Quick tip: Review the sequence of events here when reconstructing what happened across runs, executions, and approvals.
- Open Timeline when you need chronology.
- Use it during investigations, postmortems, and handoffs.
- Pair it with Records when you need both event order and persisted evidence.

## Runtime
Runtime is the health and posture workspace. It is where bridge freshness, executor availability, workspace ownership, and governance posture become explicit.
### Operator checklist
- Start on Overview when bridge freshness or backend posture is in doubt.
- Use Executors and Workspaces to confirm current ownership and surface availability.
- Use Governance before describing admitted capability scope or lock posture to others.
### Launchpad shortcut

- **Runtime**: Bridge status, executors, workspaces, and governance health.
- Open Runtime when you need live health and posture confirmation before making real-editor claims.

### Windows
#### Runtime Console
- Monitor live runtime health and move between overview, executors, and workspaces.
- Quick tip: Use this console for runtime health, bridge visibility, executor availability, and workspace ownership.
- Use Runtime Console for health and ownership checks.
- Keep it open during live bridge investigations or when validating operator assumptions.
- Treat it as the main runtime dashboard for non-governance views.
#### Governance Deck
- Admitted capability posture, lock state, and policy guardrails.
- Quick tip: Use Governance Deck when you need the policy and admitted-capability truth, not just health telemetry.
- Open Governance when you need the authoritative posture read.
- Check admitted-real versus excluded surfaces here before broad claims.
- Use it during reviews, proof runs, and operator handoffs.
### Surfaces and tabs

#### Overview

- Bridge health, runtime status, and system summaries.
- Quick tip: Start here for heartbeat freshness, runtime summaries, and first-pass bridge status.
- Use this tab first when the bridge or backend looks stale.
- Treat this as the main health check surface.
- Escalate to Governance when you need policy truth instead of only status.

#### Executors

- Execution owners, availability, and related records.
- Quick tip: Inspect executor availability and ownership here before routing work or diagnosing missing capacity.
- Use Executors to confirm who can run a task right now.
- Open related records when you need evidence behind executor state.
- Pair this with Command Center if ownership affects dispatch choice.

#### Workspaces

- Project surfaces, ownership, and attached activity.
- Quick tip: Use this tab to inspect project workspace coverage and attached activity before assuming a target is live.
- Check workspace ownership here when the active project context is unclear.
- Use it to confirm which project surfaces are attached to the current runtime.
- Pair it with Overview when heartbeat is fresh but the wrong workspace is attached.

#### Governance

- Policies, locks, and admitted capability posture.
- Quick tip: Open Governance to inspect policies, locks, and the currently admitted capability boundary.
- Use Governance before claiming a surface is admitted real.
- Check lock and policy posture here during approvals or safety reviews.
- This is the runtime surface most closely tied to truth claims about capability.

## Records
Records is the evidence workspace. When you need persisted truth, this is where you verify it instead of relying on short-term UI state alone.
### Operator checklist
- Open Runs to understand lineage and unresolved work at the run level.
- Open Executions when warnings, truth markers, or child evidence need review.
- Open Artifacts before sharing outputs or claiming a mutation result is safe.
- Open Events when a persisted timeline row needs full receipt or detail review.
### Launchpad shortcut

- **Records Explorer**: Runs, executions, artifacts, and detail drilldowns in one organized lane.
- Open Records when you need persisted evidence rather than only live status.

### Windows
#### Records Explorer
- Inspect persisted runs, executions, artifacts, and events in a dedicated workspace.
- Quick tip: Use the tab strip to move through persisted evidence surfaces without leaving the evidence workspace.
- Stay in Records while reviewing evidence.
- Use tab changes to pivot between runs, executions, artifacts, and events instead of leaving the workspace.
- Treat this workspace as the closeout and handoff evidence source.
### Surfaces and tabs

#### Runs

- Dispatch lineage and run-level audit slices.
- Quick tip: Use Runs for lineage, unresolved work, and high-level audit review.
- Start here when you need the run-level picture.
- Use it to choose which run deserves deeper execution or artifact review.
- Pair it with Timeline when chronology matters.

#### Executions

- Execution warnings, truth markers, and child evidence.
- Quick tip: Inspect execution warnings and truth markers here before claiming success or admitted-real outcome.
- Use this tab when warnings or truth labels need review.
- Inspect child evidence before closing the lane.
- Open linked artifacts when an execution claims a file or mutation result.

#### Artifacts

- Output inspection and mutation-risk evidence.
- Quick tip: Use Artifacts to inspect outputs, evidence summaries, and mutation risk before sharing or promoting results.
- Review artifacts before handoff or publish.
- Use artifact evidence to confirm whether a mutation claim is trustworthy.
- Treat this tab as the source of truth for output files, not just a convenience view.

#### Events

- Timeline chronology and persisted event receipts.
- Quick tip: Use Events to inspect persisted timeline records, including App OS audit receipts and event-level metadata.
- Use this tab when a timeline row needs full event detail instead of a compact card.
- Inspect App OS apply and revert receipts here after the original modal is closed.
- Treat this tab as the persisted event record view, not a replacement for runs or execution detail.


## Maintenance workflow

- Edit this catalog when desktop labels, workflows, or supported surfaces change.
- Run npm run guide:sync in frontend to regenerate docs/APP-OPERATOR-GUIDE.md from the same source.
- Re-run .\backend\runtime\prove_live_editor_authoring.cmd when the admitted real editor boundary changes so the latest evidence bundle stays fresh.
- Frontend tests run a guide drift check so catalog changes are not silently shipped without synced docs.
