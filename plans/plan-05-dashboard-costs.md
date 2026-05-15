# Plan 05 — Dashboard & Costs

## Goal

Admin has full operational reporting: time-spent breakdown per customer (by request type, avg minutes, total minutes). All placeholder UI replaced. Company-level settings (WhatsApp group ID) configurable via admin UI.

## Depends on

- plan-03: Request entities, done_at, time_spent_minutes pattern
- plan-04: Invoice system complete

## Tasks

Listed in execution order. Tasks marked [parallel] can run concurrently.

- [ ] `tasks/plan-05-dashboard-costs/00-backend-system-settings.md` — SystemSettings entity + GET/PATCH /system-settings (admin only)
- [ ] `tasks/plan-05-dashboard-costs/01-backend-time-tracking.md` — GET /customers/{id}/time-report: jOOQ aggregation by request type [depends on plan-03 request entities]
- [ ] `tasks/plan-05-dashboard-costs/02-frontend-time-tracking.md` — Wire Time Tracking tab in CustomerDetailView [depends on 01]
- [ ] `tasks/plan-05-dashboard-costs/03-frontend-settings.md` — /settings page for admin [depends on 00] [parallel with 02]

## Validation

At the end of this plan, a human reviewer confirms:

- Admin opens customer detail → Time Tracking tab shows per-type breakdown with counts and avg minutes
- Admin navigates to /settings → saves company_whatsapp_group_id → value persists on reload
- Non-admin user accessing /settings is redirected to /overview
- No placeholder text remains anywhere in the UI
- `mvn verify` and `pnpm build` pass
