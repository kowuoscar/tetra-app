# Plan 02p — Customer & Asset Improvements

## Goal

Admin can create a customer with only the company name (contact info and WhatsApp group ID optional). SIM cards carry a provider (Free/Orange/Bouygues/SFR/Coriolis) and a French mobile number. The phones tab shows enriched SIM card details (provider, number, type, cost) and lets admin unassign a SIM from a phone. Status badges across all dashboards display a coloured dot and correct semantic colours. All customer/asset forms validate inputs client-side before submission.

## Feature brief

`features/customer-asset-improvements.md`

## Depends on

- `plans/plan-02-customers-assets.md` — Customer, Phone, SimCard entities, CRUD endpoints, and all customer/asset UI must be complete before these improvements are applied on top

## Drift corrections applied

From `docs/drift-report.md`:

- `POST /customers` `required` array: `contact_info` and `whatsapp_group_id` removed — both fields are nullable VARCHAR in the DB; admin may not have them at creation time
- `CreateCustomerRequest.java`: `@NotBlank` removed from `contactInfo` and `whatsappGroupId`
- `badge.tsx`: Base UI `useRender`/`mergeProps` component with `default/secondary/destructive/outline/ghost/link` variants → replaced with standalone `StatusBadge` using `success/warning/error/info/neutral/brand` variants + 6px dot indicator
- `EditPhoneModal`: `replaced` status option rendered as selectable — backend returns 422; option removed from form

## Tasks

Listed in execution order. Tasks marked [parallel] can run concurrently.

- [ ] `tasks/plan-02p-customer-asset-improvements/01-backend-migration-sim-card-fields.md` — Flyway V3: add `provider` and `number` columns to `sim_cards`
- [ ] `tasks/plan-02p-customer-asset-improvements/03-backend-customer-optional-fields.md` — Remove `@NotBlank` from `contactInfo` and `whatsappGroupId` in `CreateCustomerRequest` [parallel with 01]
- [ ] `tasks/plan-02p-customer-asset-improvements/04-frontend-badge-rebuild.md` — Replace `badge.tsx` with standalone `StatusBadge` component; update all usages [parallel with 01]
- [ ] `tasks/plan-02p-customer-asset-improvements/02-backend-simcard-provider-number.md` — `SimProvider` enum, `SimCard` entity extension, DTO validation, jOOQ field projection [depends on 01]
- [ ] `tasks/plan-02p-customer-asset-improvements/05-frontend-types-update.md` — Extend `SimCardSummary` and `PhoneSummary.sim_card` TypeScript types [depends on 02]
- [ ] `tasks/plan-02p-customer-asset-improvements/06-frontend-create-customer-modal.md` — Optional contact/WhatsApp fields + full form validation [depends on 03, 04]
- [ ] `tasks/plan-02p-customer-asset-improvements/07-frontend-sim-modals.md` — `CreateSimCardModal` + `EditSimCardModal`: provider select, FR number field, conditional fee [depends on 02, 05, 04]
- [ ] `tasks/plan-02p-customer-asset-improvements/08-frontend-phones-tab-enrich.md` — Enriched SIM column display + Unassign SIM button in `CustomerPhonesTab` [depends on 02, 05, 04]

## Validation

At the end of this plan, a human reviewer confirms:

- Admin creates a customer with only the name — customer saves without contact info or WhatsApp group ID
- Admin creates a SIM card — form requires provider (select) and FR mobile number; postpaid shows fee field, prepaid hides it
- Phones tab SIM column shows `Orange · +33 6 12 34 56 78 · postpaid · €89.00/mo` for postpaid and `Free · +33 7 98 76 54 32 · prepaid` for prepaid
- Admin clicks "Unassign SIM" on a phone — SIM becomes unassigned, phone row shows "Assign SIM" button
- Status badges everywhere show a 6px coloured dot and use correct semantic colours (green=success, amber=warning, red=error, blue=info, slate=neutral)
- `EditPhoneModal` no longer shows "Replaced" as a selectable status option
- Submitting any customer/asset form with invalid data shows inline validation errors before the API is called
- `mvn verify` and `pnpm build` pass clean
