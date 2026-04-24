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

Operational defaults for repo work:
- Prefer one small verifiable packet over broad speculative changes.
- Do not widen capability claims beyond what code, tests, and runtime prove.
- Finish the next missing gate on the critical path before adding breadth.
- Keep docs aligned with code truth after a capability is promoted.

Completion footer default for work packets:
- Capabilities moved
- Evidence
- Scope added
- Still blocked by
- Recommended next packet
- Revert path

If the user later chooses a different operating model, update this file and the
linked charter together so future threads inherit the new default cleanly.
