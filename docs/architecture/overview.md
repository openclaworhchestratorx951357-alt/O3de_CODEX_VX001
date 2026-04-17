# Architecture Overview

## Purpose

`O3de_CODEX_VX001` is the control-plane app for operating O3DE-focused agents through a customizable GUI and a policy-aware backend.

The app is intended to let an operator:
- inspect project and engine state
- issue structured tool calls
- review approvals before risky mutations
- observe handoffs between agent domains
- collect logs, artifacts, screenshots, and validation evidence

## High-level layers

### 1. Frontend
The frontend is the operator-facing GUI.

Planned responsibilities:
- customizable layouts and panels
- agent status and controls
- approval queue
- task timeline
- artifacts and logs viewers
- render and validation views

### 2. Backend
The backend is the orchestration layer.

Planned responsibilities:
- request validation
- tool dispatch
- lock enforcement
- approval checks
- run history and audit records
- artifact registration
- project and engine context handling

### 3. Agent domains
The initial domain split follows the proposed contract:
- Editor Control Agent
- Asset / Media Pipeline Agent
- Render / Lookdev Agent
- Project / Build Agent
- Engine Code Agent
- Validation Agent

## Design principles

1. Separate live Editor control from config, build, and engine patch workflows.
2. Prefer structured, typed tool calls over arbitrary script execution.
3. Require explicit approval for destructive, config, build, and engine-level mutations.
4. Keep agent ownership boundaries clear so orchestration remains predictable.
5. Preserve auditability by recording actions, artifacts, and state transitions.

## Initial repository mapping

- `frontend/` — operator GUI
- `backend/` — orchestration API and runtime services
- `contracts/` — human-readable tool contracts and policies
- `schemas/` — JSON schemas for envelopes, tools, and layouts
- `agents/` — agent definitions and capability boundaries
- `docs/` — architecture, plans, and operating documentation

## Near-term implementation target

The first implementation slice should prove the end-to-end path for:
- loading project context
- opening a structured tool form in the GUI
- validating a request envelope
- routing it through the backend
- enforcing approval and lock checks
- recording the result and artifacts

This gives the app a real control loop before deeper O3DE integrations are added.
