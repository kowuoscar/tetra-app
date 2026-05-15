# Plan 03 — Requests

## Goal

Company and customer users can submit service requests (phone repair, phone replacement, SIM top-up, new SIM, manual support, onboarding). Admin can manage request status, add fees and parts. Photo attachments can be uploaded by any role. Completing a request triggers the correct asset side-effects (phone/SIM status changes). Automated WhatsApp messages fire on request creation and status changes.

## Depends on

- plan-02: Customers, phones, SIM cards all in place; CustomerRepository, PhoneRepository, SimCardRepository, DashboardService exist

## Tasks

Listed in execution order. Tasks marked [parallel] can run concurrently.

- [ ] `tasks/plan-03-requests/00-backend-request-entity.md` — Request, RequestPart, Attachment entities + domain event classes
- [ ] `tasks/plan-03-requests/01-backend-storage-service.md` — MinIO StorageService + S3 client config [parallel with 00]
- [ ] `tasks/plan-03-requests/02-backend-request-service.md` — full RequestService: create/list/get/PATCH + parts; asset side-effects; update dashboard + cost breakdown [depends on 00]
- [ ] `tasks/plan-03-requests/03-backend-attachments.md` — POST/GET /requests/{id}/attachments streaming [depends on 01, 02]
- [ ] `tasks/plan-03-requests/04-backend-whatsapp-notifications.md` — WhatsAppService + event listeners + MonthlyCostSummaryJob [depends on 02]
- [ ] `tasks/plan-03-requests/05-frontend-new-request-form.md` — /requests/new multi-step form [depends on 02]
- [ ] `tasks/plan-03-requests/06-frontend-request-list.md` — /requests page with filters [depends on 02] [parallel with 05]
- [ ] `tasks/plan-03-requests/07-frontend-request-detail.md` — /requests/[id] with status/fee/parts/attachments [depends on 02, 03]
- [ ] `tasks/plan-03-requests/08-frontend-request-tabs-history.md` — wire Requests tab in customer detail + /history page [depends on 02] [parallel with 05, 06]

## Validation

At the end of this plan, a human reviewer confirms:

- Customer submits a phone repair request — appears in admin request list with status `submitted`
- Admin moves request to `in_progress` then `done` — phone status changes to `active` after done
- Customer submits phone replacement — old phone becomes `replaced`, new phone appears in customer's phone list
- Admin adds a part to a request — part fee shows on request detail and cost breakdown
- Photo attachment uploads on a request — attachment appears in request detail
- `/customers/{id}` Requests tab shows requests for that customer
- Customer sees own requests on `/requests` page; cannot see other customers' requests
- WhatsApp notifications log at INFO when dispatch is called (even if API token not configured)
- `mvn verify` and `pnpm build` pass
