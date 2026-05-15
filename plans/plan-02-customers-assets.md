# Plan 02 — Customers & Assets

## Goal

Admin can create customers and add phones and SIM cards to them. Admin and company can browse the customer list with live summary stats and drill into a customer detail page showing their phones and SIM cards. Customer users can view their own phones and SIM cards. The dashboard overview stat counts are live.

## Depends on

- plan-01: Auth, RBAC, AppShell with nav links all working

## Tasks

Listed in execution order. Tasks marked [parallel] can run concurrently.

- [ ] `tasks/plan-02-customers-assets/00-backend-customer-entity.md` — Customer entity, repository, basic CRUD (POST/GET/PATCH)
- [ ] `tasks/plan-02-customers-assets/01-backend-phone-simcard-entities.md` — Phone + SimCard + SimMonthlyBilling entities, all service CRUD [depends on 00]
- [ ] `tasks/plan-02-customers-assets/02-backend-aggregations.md` — jOOQ CustomerSummary list, DashboardStats, CostBreakdown endpoint [depends on 01]
- [ ] `tasks/plan-02-customers-assets/03-frontend-customer-list.md` — Customer list page, search, create-customer modal [depends on 02]
- [ ] `tasks/plan-02-customers-assets/04-frontend-customer-detail.md` — Customer detail page with Phones tab + SIM Cards tab + Cost Breakdown tab [depends on 02]
- [ ] `tasks/plan-02-customers-assets/05-frontend-customer-role-views.md` — My Phones + My SIM Cards pages (customer role) [depends on 01] [parallel with 03 and 04]

## Validation

At the end of this plan, a human reviewer confirms:

- Admin creates a customer via the UI — customer appears in the list
- Admin adds a phone and SIM card to a customer — they appear on the customer detail page
- Phones tab shows is_unused badge for phones with no SIM assigned
- SIM Cards tab shows is_unused badge for SIMs with no phone linked
- Admin sees customer list with correct phone_count, sim_card_count, open_request_count=0
- Dashboard Overview stat cards show live counts
- Customer user logs in and sees their phones and SIM cards only
- `GET /customers/{id}` for a customer-role user accessing another customer's ID returns 403
- `mvn verify` and `pnpm build` pass
