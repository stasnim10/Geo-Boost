---
name: GitHub push quirks
description: Constraints discovered when publishing repository history through the connected GitHub API.
---

The shell Git client does not inherit Replit’s connected GitHub authorization. When using the GitHub Git Database API instead, custom author metadata can be rejected by the provider edge layer even though minimal commit creation works; verify final tree parity, not only the remote commit SHA.

**Why:** A direct HTTPS push failed without credentials, and GitHub returned an HTML 403 for commit requests carrying local author metadata while accepting the same tree with default authorship.

**How to apply:** Prefer a native authenticated Git transport when available. If REST synchronization is required, upload blobs first, use non-forced ref updates, and compare the remote commit tree SHA with local `HEAD^{tree}` before reporting success.