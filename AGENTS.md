# Agent Working Defaults

This repository adopts [docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md](docs/CODEX-EVERGREEN-EXECUTION-CHARTER.md)
as the default evergreen execution charter for Codex and other repo-working agents.

Treat that charter as the stable reference for:
- how to choose the next work packet
- how to classify capability maturity
- how to decide what is actually real vs simulated vs plan-only
- how to keep work narrow, reviewable, and truthful

Use this priority order when instructions conflict:
1. Active system, developer, and user instructions in the current thread
2. Current code, targeted tests, and observed runtime behavior
3. This repo's evergreen charter
4. Other repo docs and roadmap text

Default standing rule:
- Use the evergreen charter until the user explicitly replaces or supersedes it.
- If the user says "use supervisor mode", immediately activate the startup
  protocol in `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`: verify repo
  state, organize explicit supervisor/worker roles, check project-local
  dependencies, read the required startup docs, report readiness, and then
  apply `docs/CODEX-WORKFLOW-GOVERNOR.md` before creating a branch, commit, or
  PR.
- For any new phase, next slice, or "continue the project" request, start from
  `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`,
  `docs/CODEX-WORKFLOW-GOVERNOR.md`,
  `docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md`,
  `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md` and
  `docs/NORMALIZED-PHASE-WORKFLOW.md` before choosing or implementing the next
  packet.
- For project-moving work packets, append timestamped slice-log entries to
  `C:\Users\topgu\OneDrive\Documents\New project\continue-queue\codex-slice-log.txt`
  using `scripts/Add-Codex-Slice-Log.ps1` at minimum:
  1) when startup readiness is confirmed, and
  2) when each packet/slice is completed (before final report).
  This is a required pre-final-response gate: do not send the final project
  report until the completion entry is appended.
  In the final report, include the exact completion log line that was appended.
  If the helper script is unavailable, append using equivalent PowerShell
  `Add-Content` with ISO timestamps.

## Mandatory O3DE Evidence Substrate Check

Before declaring a capability blocked, Codex must read
`docs/O3DE-EVIDENCE-SUBSTRATE-CHECK.md` and check whether O3DE already stores
the needed information in a cache, database, catalog, generated output, or
proof artifact. If a read-only bounded proof path exists, proceed to proof-only
readback instead of declaring blocked.

Operational defaults for repo work:
- Prefer one small verifiable packet over broad speculative changes.
- The packet must be project-moving. Do not create standalone PRs only to
  refresh status SHAs, echo existing docs, or add another refusal-only note
  unless the operator explicitly asks for that exact packet.
- Bundle incidental status, index, and handoff updates into the same meaningful
  PR that caused the truth change.
- Do not widen capability claims beyond what code, tests, and runtime prove.
- Finish the next missing gate on the critical path before adding breadth.
- Keep docs aligned with code truth after a capability is promoted.
- Bootstrap only project-local, repo-declared dependencies when validation needs
  them. Do not perform global/system installs, dependency upgrades, lockfile
  rewrites, or package additions without the risk review and approvals described
  in the startup protocol.

Completion footer default for work packets:
- Capabilities moved
- Evidence
- Scope added
- Still blocked by
- Recommended next packet
- Revert path

If the user later chooses a different operating model, update this file and the
linked charter together so future threads inherit the new default cleanly.
