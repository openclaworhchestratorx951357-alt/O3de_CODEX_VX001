# frontend

React and Vite frontend for the O3DE Agent Control app.

## Requirements

- Node.js 20+
- npm

## Install

1. Change into the frontend directory.
2. Run npm install.

## Run

1. Change into the frontend directory.
2. Run npm run dev.

## Build

1. Change into the frontend directory.
2. Run npm run build.

## Environment

The frontend uses `VITE_API_BASE_URL` to decide which backend to call.

Example:

- `VITE_API_BASE_URL=http://localhost:8000`

If the variable is not set, the frontend defaults to `http://localhost:8000`.

## Current UI

- agent control panels
- approval queue
- layout header
- task timeline
- tools catalog
- dispatch form and response viewer
