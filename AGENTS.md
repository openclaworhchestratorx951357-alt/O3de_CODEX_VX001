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
  continue into the normalized phase workflow.
- For any new phase, next slice, or "continue the project" request, start from
  `docs/FUTURE-THREAD-SUPERVISOR-STARTUP-PROTOCOL.md`,
  `docs/CODEX-PROJECT-WORKFLOW-QUICK-REFERENCE.md` and
  `docs/NORMALIZED-PHASE-WORKFLOW.md` before choosing or implementing the next
  packet.

Operational defaults for repo work:
- Prefer one small verifiable packet over broad speculative changes.
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
