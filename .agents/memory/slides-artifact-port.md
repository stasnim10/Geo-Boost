---
name: Slides artifact port registration
description: Slides artifacts must use a supported port AND have it registered in .replit [[ports]] or the workflow health probe reports DIDNT_OPEN_A_PORT.
---

## The Rule

When a slides (or any) artifact uses a port that is:
1. Not in the supported list: `3000, 3001, 3002, 3003, 4200, 5000, 5173, 6000, 6800, 8000, 8008, 8080, 8099, 9000`
2. Not declared as a `[[ports]]` entry in `.replit`

...the workflow system's port probe will time out even if Vite started successfully and is listening.

**Why:** The `DIDNT_OPEN_A_PORT` check in `agentRestartRunWorkflow` uses `.replit [[ports]]` registrations to know which ports to probe. An unregistered port (e.g. 21268) is never probed, so the workflow always times out.

**How to apply:**
- When `createArtifact` allocates a port outside the supported list, update artifact.toml via `verifyAndReplaceArtifactToml` to use a supported port (e.g. 3003).
- Then register it in `.replit` via `verifyAndReplaceDotReplit` with a `[[ports]]` entry.
- Artifact-managed workflows cannot be overridden with `configureWorkflow` — must go through the artifact TOML path.
