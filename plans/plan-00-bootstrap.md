# Plan 00 — Bootstrap

## Goal

Working, deployable empty shell at the end of this plan. No user-facing features. Every subsequent plan builds on top of this foundation.

## Deliverables

- [ ] Backend: Spring Boot app scaffolded with feature package structure, health check endpoint, PostgreSQL connection configured, Flyway running full initial schema migration
- [ ] Frontend: Next.js app scaffolded with TypeScript, pnpm, Tailwind CSS, shadcn/ui, design tokens integrated, routing configured with empty authenticated shell
- [ ] Infrastructure: Kubernetes namespaces created, Kustomize base manifests for all four components, ArgoCD Application manifests committed to GitOps monorepo, staging environment synced
- [ ] Database: PostgreSQL running (local via Docker Compose, staging/production via StatefulSet), all tables created by initial Flyway migration
- [ ] Local dev: `docker compose up` starts full stack (Next.js, Spring Boot, PostgreSQL, MinIO) with Flyway running migrations on startup

## Depends on

None — this is the foundation plan.

## Tasks

Listed in execution order. Tasks marked [parallel] can run concurrently.

- [ ] `tasks/plan-00-bootstrap/00-backend-scaffold.md` — Spring Boot scaffold, full schema migration, Docker Compose
- [ ] `tasks/plan-00-bootstrap/01-frontend-scaffold.md` — Next.js scaffold, design tokens, route groups, empty shell [parallel with 00]
- [ ] `tasks/plan-00-bootstrap/02-infrastructure-gitops.md` — GitOps monorepo structure, Kustomize manifests, ArgoCD Applications [depends on 00 and 01]
- [ ] `tasks/plan-00-bootstrap/03-infrastructure-ci.md` — GitHub Actions pipeline: lint, test, build, update manifests, smoke test [depends on 02]

## Validation

At the end of this plan, a human reviewer confirms:

- `GET /actuator/health` returns `200 {"status":"UP"}` in staging
- Frontend builds and serves without errors (`pnpm build` exits 0)
- `docker compose up` starts all services locally; `localhost:8080/actuator/health` returns `200 {"status":"UP"}`; `localhost:3000` serves the Next.js app
- CI pipeline passes on `develop` branch — all stages green
- ArgoCD shows `tetra-staging` application as `Synced` and `Healthy`
- All automated checks pass
