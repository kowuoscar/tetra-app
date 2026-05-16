# Tetra Billing Dashboard

> Internal billing and operations tool for Tetra Mobile Solutions FZ-LLC — admin (Oscar) manages customers, phones, SIM cards, service requests, and invoices; company users have read-only access; customers can view their own assets and submit requests.

---

## Current plan

**Active:** `plans/plan-02-customers-assets.md`
**Status:** Not started
**Previous:** `plans/plan-01-auth.md` — Complete

Update this section at the start of each plan. It is the first thing every agent session reads.

---

## Agent rules

These rules apply to every agent session without exception. Do not deviate from them. If a required decision is not covered by the reference artifacts, stop and ask the user — do not guess.

1. Read this file completely before doing anything else
2. Read the active plan file before starting any task
3. Read the task file completely before writing any code
4. Never implement a frontend component without first reading `specs/frontend.md` and `design/tokens.md`
5. Never create a backend endpoint not listed in `docs/contracts.md`
6. Never create a database table or field not described in `docs/architecture.md`
7. Never invent design values — all colors, spacing, typography, and shadows must come from `design/tokens.md`
8. Never call another feature's repository or database table directly — cross-feature interactions go through domain events (`ApplicationEventPublisher`) or the service layer
9. Always check `depends_on` in a task file before starting — the dependency must be marked complete first
10. Always run the automated checks in the task file before marking a task done
11. Never modify a spec file or contract file during implementation — if a spec is wrong, stop and flag it to the user
12. Follow naming conventions in `~/.claude/skills/planning/context/conventions.md` exactly
13. **ORM split:** use JPA+Hibernate for standard CRUD; use jOOQ for any query with joins across multiple tables, aggregations, correlated subqueries, or `GROUP BY` — never fight the ORM for complex queries
14. **Cookies:** access token in `access_token` (httpOnly, SameSite=Strict, path=`/`, 15 min); refresh token in `refresh_token` (httpOnly, SameSite=Strict, path=`/api/v1/auth/refresh`, 7 days). Never read auth cookies from JS.
15. **Domain events:** publish via `ApplicationEventPublisher`; consume via `@TransactionalEventListener(phase = AFTER_COMMIT)` with `@Transactional(propagation = REQUIRES_NEW)`. Asset side-effects and WhatsApp notifications always run in a new transaction after the triggering commit.
16. **WhatsApp notifications:** fire-and-forget — failure logs at WARN, never throws, never causes rollback. When `WHATSAPP_API_TOKEN` is unset, log at INFO and return immediately.
17. **Storage:** all file operations go through `StorageService` — never call `S3Client` directly from a service or controller. `StorageService` interface: `upload()`, `download()`, `getPresignedDownloadUrl()`, `delete()`.
18. **Binary streaming:** attachment downloads and invoice PDFs stream binary directly from the API via `StorageService.download()` → `InputStream.transferTo(response.getOutputStream())`. Presigned URLs are NOT used for end-user file downloads.
19. **`GET /auth/me`** is a required endpoint not in `docs/contracts.md` — it is defined in `tasks/plan-01-auth/02-backend-auth-endpoints.md` and used by Next.js server components to hydrate auth state
20. **`getMe()`** lives in `src/lib/data/auth.ts` — import from there; never re-define inline in a layout or page
21. **jOOQ codegen:** run `./mvnw generate-sources` (DDLDatabase reads from `V1__initial_schema.sql`) before working on any jOOQ query class. DSL classes land in `target/generated-sources/jooq`
22. **Admin seed user** is created by Flyway V1 migration (email: `admin@tetramobile.ae`, password in migration). Do not hardcode credentials anywhere else.
23. **Request field names (contracts.md exact):** `notes` (not `description`), `author` (customer|company — derived from caller role, never in request body), `fee` (nullable BigDecimal, admin-sets via PATCH — not computed from parts). `RequestPart`: `description` + `cost` (not `name`/`fee`). Attachments: max 10 MB, image/jpeg/png/webp only; `AttachmentSummary = {id, uploaded_by_user_id, created_at}` — no filename or download URL in payload.
24. **Invoice is company-wide:** one invoice per calendar month for Tetra Mobile Solutions FZ-LLC — NOT per-customer. Fields: `support_fees` (admin sets), `support_expenses` (frozen at send = all SIM fees + request part costs), `rolling_advance_current` (admin+company), `rolling_advance_previous` (auto-carry), `previous_balance` (auto-carry from prior unpaid), `taxes` (always 0). No `InvoiceLineItem` entity. No `customer_id` on Invoice.
25. **System settings** hold bank/payment details for invoice PDFs: `bank_account_holder`, `bank_iban`, `bank_swift`, `company_name`, `company_address`. Singleton row UUID `00000000-0000-0000-0000-000000000001`. Endpoint is `PUT /settings` (full replace, all fields required). WhatsApp group IDs are per-customer (on `customers` table), not in system settings.

---

## Reference artifacts

| File | Purpose |
|------|---------|
| `vision.md` | Product intent, users, features, constraints |
| `docs/architecture.md` | System context, component map, data flows, ERD, auth strategy |
| `docs/contracts.md` | All API endpoints with request/response shapes |
| `design/brief.md` | Design direction, typography, color intent, component patterns |
| `design/tokens.md` | Complete token system — CSS custom properties + Tailwind config |
| `design/preview.html` | Interactive component gallery and page layouts |
| `specs/frontend.md` | Pages, component inventory, navigation, state management |
| `specs/backend.md` | Services, business rules, invariants, data layer, security |
| `specs/infrastructure.md` | Environments, Kubernetes manifests, CI/CD, secrets, observability |

---

## Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Frontend framework | Next.js (App Router) | 15 — Server Components default |
| Frontend language | TypeScript | strict mode |
| Frontend package manager | pnpm | monorepo root `web/` |
| Frontend styling | Tailwind CSS + shadcn/ui | tokens in `design/tokens.md` |
| Frontend state | TanStack Query v5 (server) + Zustand (auth) | — |
| Backend framework | Spring Boot | 3.x |
| Backend language | Java | 21 |
| Backend ORM | JPA+Hibernate (CRUD) + jOOQ (aggregations) | hybrid — see rule 13 |
| Database | PostgreSQL | 16 |
| DB migrations | Flyway | `api/src/main/resources/db/migration/` |
| PDF generation | Thymeleaf → HTML → OpenPDF | in-JVM, no external service |
| File storage | MinIO (S3-compatible) | AWS SDK v2, path-style access |
| WhatsApp | WhatsApp Business API | send-only, fire-and-forget |
| Container registry | Docker Hub | `tetramobile/tetra-web`, `tetramobile/tetra-api` |
| Kubernetes | kubeadm on Hetzner | — |
| GitOps | ArgoCD + Kustomize | `git@github.com:tetramobile/tetra-gitops.git` |
| CI | GitHub Actions | `ci.yml` (lint+test), `deploy.yml` (build+deploy) |
| Ingress | Traefik | path-based routing, same domain for SameSite=Strict |
| Secrets | Sealed Secrets | `kubeseal` — never commit plaintext secrets |
| Auth | Self-built JWT | HS256, httpOnly cookies, refresh token rotation |

---

## Monorepo layout

```
tetra-app/
  api/                          # Spring Boot — com.tetramobile.tetra
  web/                          # Next.js 15 — src/
  docker-compose.yml            # local dev: postgres + minio + api + web
  .github/
    workflows/
      ci.yml
      deploy.yml
  plans/
  tasks/
  specs/
  docs/
  design/
```

---

## Environments

| Environment | Domain | K8s namespace | Deploy trigger |
|-------------|--------|---------------|----------------|
| Staging | `staging.tetra.tetramobile.ae` | `tetra-staging` | Push to `develop` |
| Production | `tetra.tetramobile.ae` | `tetra-production` | Push to `main` + manual approval |

---

## Plans

| Plan | File | Status | Goal |
|------|------|--------|------|
| 00 | `plans/plan-00-bootstrap.md` | Not started | Deployable skeleton: Spring Boot + Next.js + PostgreSQL + MinIO + CI/CD + GitOps |
| 01 | `plans/plan-01-auth.md` | Not started | Login, JWT cookies, refresh rotation, RBAC, AppShell |
| 02 | `plans/plan-02-customers-assets.md` | Not started | Customers, phones, SIM cards, cost breakdown, dashboard stats |
| 03 | `plans/plan-03-requests.md` | Not started | All 6 request types, status flow, asset side-effects, attachments, WhatsApp notifications |
| 04 | `plans/plan-04-billing-invoices.md` | Not started | Company-wide monthly invoice, PDF generation, MinIO storage, sent/paid lifecycle |
| 05 | `plans/plan-05-dashboard-costs.md` | Not started | Time tracking reports, system settings (bank details), all placeholder UI replaced |

---

## Key domain rules (summary — full rules in `specs/backend.md`)

| Domain | Rule |
|--------|------|
| Auth | Three roles: `admin`, `company`, `customer`. Customer JWT carries `customer_id` claim. |
| Request status | `submitted → in_progress → done` only. Backwards transitions → 422. |
| Request done | Set `done_at = now()` in same transaction as status change. |
| Request fields | `notes` (nullable text), `author` (customer\|company, auto-set), `fee` (nullable, admin-sets via PATCH). |
| RequestPart fields | `description` (VARCHAR 255) + `cost` (NUMERIC). No `name` or `fee` fields. |
| Attachments | 10 MB max, image/jpeg/png/webp only. Binary stream download. No list endpoint — embedded in RequestDetail. |
| Asset side-effects | Triggered by `RequestStatusChangedEvent` AFTER_COMMIT in a new transaction. |
| Phone replacement | Old phone → `replaced`; new `Phone` entity created with `status=active`, model from `request.notes`. |
| Invoice | Company-wide, one per month. No `customer_id`. No line items. `computeTotal()` = support_fees + support_expenses + rolling_advance_current − rolling_advance_previous + previous_balance + taxes. |
| Invoice status | `draft → sent → paid`. `paid` is terminal. `support_expenses` frozen at send time. |
| Invoice auto-carry | On draft creation: `rolling_advance_previous` ← prior month's `rolling_advance_current`; `previous_balance` ← prior invoice total if unpaid. |
| PDF | Generated in-JVM at send; stored in MinIO at `invoices/{invoiceNumber}.pdf`; streamed binary via `GET /invoices/{id}/pdf`. |
| Cost breakdown | SIM fees use actual billing amount if `sim_monthly_billing` row exists, otherwise `base_monthly_fee`. |
| System settings | Bank details only (account holder, IBAN, SWIFT, company name, address). Singleton UUID `00000000-0000-0000-0000-000000000001`. PUT replaces all fields. |
| WhatsApp | Events: request created, status changed, invoice sent, monthly summary (1st of month 08:00 UTC). Per-customer group IDs stored on `customers.whatsapp_group_id`. |
| `time_spent_minutes` | `EXTRACT(EPOCH FROM (done_at - created_at)) / 60`. Admin-only field, null until done. |
| Customer access | Customer can only access own `customer_id` resources. Backend enforces — not middleware only. |

---

## Project overrides

| Decision | Project value | Global default | Reason |
|----------|--------------|----------------|--------|
| Auth strategy | Self-built JWT (HS256, httpOnly cookies, refresh rotation) | Open decision (per-project) | Internal tool; simple three-role structure; no Keycloak overhead |
| Backend language | Java 21 | Java or Kotlin (per-project) | Existing team familiarity |
| DB migration tool | Flyway | Per-project decision | Standard for Spring Boot; single migration file V1 covers full schema |
| Frontend styling | Tailwind CSS + shadcn/ui | Per-project decision | Rapid development; accessible primitives; token-compatible |
| Frontend state | TanStack Query v5 + Zustand | Per-project decision | TQ for server cache; Zustand for lightweight auth state only |
| Backend ORM | Hybrid: JPA (CRUD) + jOOQ (aggregations) | JPA or jOOQ per-project | Simple entities use JPA; CustomerSummary, cost breakdown, invoice list use jOOQ |
| Mobile | N/A — no mobile app | Flutter/Dart | Admin internal tool; browser-only |

---

## Deferred decisions

No deferred decisions.
