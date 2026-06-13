---
name: Clerk health check ordering
description: Health check must be mounted before clerkMiddleware in app.ts or it returns 500 in production when CLERK_SECRET_KEY is absent/not-yet-injected.
---

# Clerk Health Check Ordering

## Rule
Mount `/api/healthz` (and any other unauthenticated routes) **before** `clerkMiddleware()` in `app.ts`.

**Why:** `clerkMiddleware` from `@clerk/express` throws "Missing Clerk Secret Key" at request time when `CLERK_SECRET_KEY` is not present — even before Replit has had a chance to inject it. The Autoscale startup health probe fires on `/api/healthz` immediately after the container starts; if that route is behind Clerk middleware it returns 500 and the deployment promote step fails.

**How to apply:** In `app.ts`, register `app.use("/api", healthRouter)` before the `app.use(CLERK_PROXY_PATH, clerkProxyMiddleware())` line and before `app.use(clerkMiddleware(...))`. Do not rely solely on the main `/api` router (which comes after Clerk) to serve the health check.
