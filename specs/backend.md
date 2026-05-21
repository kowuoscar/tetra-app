# Backend spec

Stack: Spring Boot 3 · Java 21 · PostgreSQL · Flyway · Spring Data JPA + Hibernate (default) · jOOQ (complex queries) · JUnit 5 · AWS Java SDK v2 (MinIO)

---

## Services

---

### AuthService

**Package:** `com.tetramobile.tetra.auth`
**Owns contracts:**
- `POST /auth/login` — authenticate user, issue JWT cookies
- `POST /auth/refresh` — rotate refresh token, issue new access token
- `DELETE /auth/session` — clear both auth cookies

**Dependencies:**
- `UserRepository`: look up user by email, fetch role and is_active status
- `RefreshTokenRepository`: store, validate, and rotate refresh tokens
- `JwtTokenProvider` (shared util): sign and verify JWTs

**Domain events emitted:**
- None — auth is self-contained

---

### UserService

**Package:** `com.tetramobile.tetra.user`
**Owns contracts:**
- `GET /users` — paginated user list (admin only)
- `POST /users` — create user account (admin only)
- `PATCH /users/{id}` — update user name, email, or password (admin only)
- `DELETE /users/{id}` — soft-deactivate user account (admin only)

**Dependencies:**
- `CustomerRepository`: validate customer_id exists when role is customer

**Domain events emitted:**
- None

---

### CustomerService

**Package:** `com.tetramobile.tetra.customer`
**Owns contracts:**
- `GET /customers` — paginated customer list with computed summary stats
- `POST /customers` — create customer record (admin only)
- `GET /customers/{id}` — customer detail
- `PATCH /customers/{id}` — update customer fields (admin only)
- `GET /dashboard/stats` — aggregate counts for dashboard header

**Dependencies:**
- `PhoneRepository`: count phones per customer for `phone_count` summary
- `SimCardRepository`: count SIM cards per customer for `sim_card_count` summary
- `RequestRepository`: count open requests per customer for `open_request_count` summary; open = status != done
- `SimMonthlyBillingRepository` + `RequestRepository`: compute `current_month_cost` (see Business logic)

**Domain events emitted:**
- None

---

### PhoneService

**Package:** `com.tetramobile.tetra.phone`
**Owns contracts:**
- `GET /customers/{id}/phones` — phones for a customer, optional `include_replaced`
- `POST /customers/{id}/phones` — create phone (admin only)
- `PATCH /phones/{id}` — update phone fields (admin only)

**Dependencies:**
- `CustomerRepository`: validate customer exists

**Domain events emitted:**
- None — phone side-effects triggered by listening to `RequestDoneEvent`

---

### SimCardService

**Package:** `com.tetramobile.tetra.simcard`
**Owns contracts:**
- `GET /customers/{id}/sim-cards` — SIM cards for a customer
- `POST /customers/{id}/sim-cards` — create SIM card (admin only)
- `PATCH /sim-cards/{id}` — update SIM card fields (admin only)
- `PUT /sim-cards/{id}/monthly-billing` — upsert actual postpaid amount for period (admin only)

**Dependencies:**
- `CustomerRepository`: validate customer exists
- `PhoneRepository`: validate phone belongs to same customer when assigning

**Domain events emitted:**
- None — SIM side-effects triggered by listening to `RequestDoneEvent`

---

### RequestService

**Package:** `com.tetramobile.tetra.request`
**Owns contracts:**
- `GET /requests` — paginated, filterable request list
- `POST /requests` — submit new request (company, customer)
- `GET /requests/{id}` — request detail
- `PATCH /requests/{id}` — update status, fee, notes (admin only)
- `POST /requests/{id}/parts` — add part to request (admin only)
- `DELETE /requests/{id}/parts/{partId}` — remove part (admin only)
- `POST /requests/{id}/attachments` — upload file attachment (all roles, customer scoped)
- `GET /requests/{id}/attachments/{attachmentId}` — stream attachment (all roles, customer scoped)

**Dependencies:**
- `CustomerRepository`: validate customer exists
- `PhoneRepository`: validate phone belongs to target customer
- `SimCardRepository`: validate SIM belongs to target customer
- `StorageService`: stream file to/from MinIO

**Domain events emitted:**
- `RequestCreatedEvent`: when a request is successfully created — carries `requestId`, `customerId`, `type`
- `RequestStatusChangedEvent`: when status is updated — carries `requestId`, `customerId`, `oldStatus`, `newStatus`, `type`, `phoneId`, `simCardId`

---

### InvoiceService

**Package:** `com.tetramobile.tetra.invoice`
**Owns contracts:**
- `GET /invoices` — paginated invoice list
- `GET /invoices/current` — get or create draft for current calendar month
- `PATCH /invoices/{id}` — update editable fields (admin full, company rolling_advance_current only)
- `POST /invoices/{id}/send` — transition draft → sent, generate PDF, notify company
- `POST /invoices/{id}/mark-paid` — transition sent → paid
- `GET /invoices/{id}/pdf` — stream generated PDF

**Dependencies:**
- `SimCardRepository` + `SimMonthlyBillingRepository` + `RequestRepository`: compute `support_expenses` at generation time
- `PdfGenerationService` (shared): generate invoice PDF via Thymeleaf + OpenPDF
- `SettingsRepository`: fetch bank details and company WhatsApp group for PDF and notification

**Domain events emitted:**
- `InvoiceSentEvent`: when invoice transitions to sent — carries `invoiceId`, `invoiceNumber`, `total`

---

### DashboardService

**Package:** `com.tetramobile.tetra.dashboard`
**Owns contracts:**
- `GET /dashboard/stats` — aggregate stats for dashboard header

**Dependencies:**
- `CustomerRepository`, `PhoneRepository`, `SimCardRepository`, `RequestRepository`: count queries

**Domain events emitted:**
- None

---

### SettingsService

**Package:** `com.tetramobile.tetra.settings`
**Owns contracts:**
- `GET /settings` — fetch system settings (admin only)
- `PUT /settings` — replace system settings (admin only)

**Dependencies:**
- None

**Domain events emitted:**
- None

---

### WhatsAppService (shared)

**Package:** `com.tetramobile.tetra.shared.whatsapp`
**No REST contracts** — internal service only.
**Listens to:** `RequestCreatedEvent`, `RequestStatusChangedEvent`, `InvoiceSentEvent`

**Purpose:** On each event, constructs and sends the appropriate approved WhatsApp template message to the customer's `whatsapp_group_id` via the WhatsApp Business API (HTTPS).

**Dependencies:**
- `CustomerRepository`: resolve `whatsapp_group_id` from `customerId`
- `SettingsRepository`: resolve company WhatsApp group ID (see Data model gap note below)
- WhatsApp Business API (Meta) via HTTPS

**Domain events emitted:**
- None

---

### StorageService (shared)

**Package:** `com.tetramobile.tetra.shared.storage`
**No REST contracts** — internal service only.

**Purpose:** Stream files to/from MinIO using AWS Java SDK v2 (S3-compatible). Called by RequestService for attachment upload and streaming.

**Dependencies:**
- MinIO via AWS Java SDK v2 (S3-compatible endpoint)

**Domain events emitted:**
- None

---

## Business logic and invariants

### Auth rules

- A login attempt must look up the user by exact email match (case-insensitive). If no user is found, return 401 with `invalid_credentials`. The response must not reveal whether the email exists or the password was wrong — both cases return the same error code.
- Password comparison must use `BCrypt.checkpw` — plaintext passwords are never stored or compared directly.
- If the user exists and password matches but `is_active` is false, return 403 with `account_deactivated`.
- On successful login, issue: (1) a short-lived access token (JWT, 15-minute TTL) and (2) a long-lived refresh token (opaque UUID, 7-day TTL). Both set as httpOnly, Secure, SameSite=Strict cookies. The refresh token cookie path is restricted to `/api/v1/auth/refresh`.
- The refresh token is stored server-side in the `refresh_tokens` table with its expiry and associated `user_id`. On refresh: validate the token exists and is not expired, issue a new access token, rotate the refresh token (delete old row, insert new row with new UUID and new expiry). If the refresh token is missing, expired, or not found in the table, return 401 with `invalid_refresh_token`.
- Refresh token rotation is idempotent within a short grace window: if the same refresh token is presented twice within 5 seconds (race condition from concurrent requests), the second call returns the already-issued new token rather than an error.
- On logout, delete the refresh token row from the table and clear both cookies with an empty-value cookie response with `Max-Age=0`.
- The JWT payload must contain: `sub` (user UUID), `role`, `customer_id` (null for admin and company). The API server reads these claims on every authenticated request — no additional DB lookup is needed for role enforcement.

### User rules

- Email must be unique across all users (case-insensitive). On `POST /users` or `PATCH /users/{id}`, if the email is already taken by another user, return 409 with `email_already_in_use`.
- When creating a user with `role = customer`, `customer_id` is required. If omitted, return 422 with `customer_id_required`. If provided but the customer does not exist, return 422 with `customer_not_found`.
- When creating a user with `role = company` or `role = admin` (note: the contract only allows creating `company` or `customer` roles — admin role cannot be created via API, only seeded), `customer_id` must be null.
- `DELETE /users/{id}` is a soft delete — sets `is_active = false`. If the admin attempts to deactivate their own account (the authenticated user's id matches the path id), return 422 with `cannot_deactivate_self`.
- A deactivated user cannot log in — `POST /auth/login` returns 403 with `account_deactivated` for users where `is_active = false`.
- `PATCH /users/{id}` is not idempotent — calling it twice with the same values produces the same result (no error), but it always applies the update and returns 200.
- The `name` field in `UserSummary` is stored on the `users` table. The `POST /users` contract requires `name`; `PATCH /users/{id}` allows updating it.

> **Data model gap:** The `users` table in `docs/architecture.md` does not include `is_active` or `name` columns. The backend spec adds them: `is_active BOOLEAN NOT NULL DEFAULT true` and `name VARCHAR NOT NULL`.

### Customer rules <!-- feature: customer-asset-improvements | added: 2026-05-21 -->

- `contact_info` and `whatsapp_group_id` are optional at creation — `POST /customers` requires only `name`. Both fields default to `null` if not provided. `PATCH /customers/{id}` may set or update them at any time.
- WhatsApp notifications will silently skip customers where `whatsapp_group_id` is null (existing behavior per WhatsApp notification rules).

### Customer rules

- `CustomerSummary.phone_count` = count of phones where `customer_id` matches and `status != 'replaced'`.
- `CustomerSummary.sim_card_count` = count of SIM cards where `customer_id` matches and `status != 'cancelled'`.
- `CustomerSummary.open_request_count` = count of requests where `customer_id` matches and `status != 'done'`.
- `CustomerSummary.current_month_cost` = sum of SIM fees + sum of done request fees for the current calendar month. SIM fee per card: if a `sim_monthly_billing` row exists for this SIM and the current period, use `actual_amount`; otherwise use `base_monthly_fee`. Only count SIMs with `status != 'cancelled'`. Request fee: sum of `fee` values for done requests in the current period where `fee is not null`.
- A customer role user accessing `GET /customers/{id}` where `id != authenticated_user.customer_id` must receive 403 with `forbidden` — not 404. This prevents enumeration.
- `PATCH /customers/{id}` allows partial updates — fields not included in the request body are left unchanged.

### Phone rules

- A phone is created with `status = 'active'`.
- `is_unused` = (`status = 'active'` OR `status = 'in_repair'`) AND `phone_id` is not referenced by any SIM card where `status != 'cancelled'`.
- Valid status transitions for `PATCH /phones/{id}`: `active → in_repair`, `in_repair → active`. The `replaced` status can only be set by the `phone_replacement` request done side-effect — it cannot be set directly via `PATCH /phones/{id}`.
- When `PATCH /phones/{id}` receives `status = 'replaced'`, return 422 with `invalid_status_transition`.
- `phone_replacement` request done side-effect: (1) set the targeted phone's `status = 'replaced'`; (2) create a new Phone row for the same customer with `model` = original phone model, `ownership` = original ownership, `status = 'active'`, `phone_id` not assigned to any SIM.
- `phone_repair` request done side-effect: set the targeted phone's `status = 'active'`.

### SIM card rules

- A SIM card is created with `status = 'active'` if `phone_id` is provided at creation; `status = 'unassigned'` otherwise.
- If `phone_id` is provided at `POST /customers/{id}/sim-cards`, validate: (1) phone exists, (2) phone belongs to this customer (else 422 `phone_belongs_to_different_customer`), (3) phone has no other SIM currently assigned where `status != 'cancelled'` (else 422 `phone_already_has_sim`).
- `is_unused` = (`status = 'active'` OR `status = 'unassigned'`) AND `phone_id IS NULL`.
- `PATCH /sim-cards/{id}` with `phone_id = null` unassigns the SIM and sets `status = 'unassigned'`.
- `PATCH /sim-cards/{id}` with a non-null `phone_id` assigns the SIM and sets `status = 'active'`. Validations same as creation.
- `PUT /sim-cards/{id}/monthly-billing` only applies to SIM cards with `type = 'postpaid'`. If the SIM is prepaid, return 422 with `sim_card_not_postpaid`.
- `PUT /sim-cards/{id}/monthly-billing` is idempotent per `(sim_card_id, period_month, period_year)` — calling it twice replaces the previous value for that period. Implemented as upsert (INSERT … ON CONFLICT UPDATE).
- `new_sim` request done side-effect: create a new SimCard row for the request's customer with `status = 'unassigned'`, `type` and `base_monthly_fee` to be confirmed via the request `notes` field at the time admin processes it. In the MVP, the admin creates the SIM record manually via `POST /customers/{id}/sim-cards` after completing the request — the request done event does not auto-create the SIM.
- `provider` must be one of: `FREE`, `ORANGE`, `BOUYGUES`, `SFR`, `CORIOLIS`. Required at `POST /customers/{id}/sim-cards`. Accepted as optional update at `PATCH /sim-cards/{id}`. Stored as `VARCHAR` with `CHECK` constraint. <!-- feature: customer-asset-improvements | added: 2026-05-21 -->
- `number` must match FR mobile MSISDN pattern: `^(\+33|0033|0)[67]\d{8}$`. Validation occurs at service layer. Required at `POST /customers/{id}/sim-cards`. Accepted as optional update at `PATCH /sim-cards/{id}`. Stored as `VARCHAR` (no uniqueness constraint). If validation fails, return 422 with `invalid_phone_number`. <!-- feature: customer-asset-improvements | added: 2026-05-21 -->
- `base_monthly_fee` for prepaid SIMs: the API accepts `0` for prepaid — the frontend sends `0` automatically when type is prepaid. No special backend logic needed; existing `minimum: 0` constraint covers it. <!-- feature: customer-asset-improvements | added: 2026-05-21 -->

### Request rules

- A customer role user can submit requests only for their own `customer_id`. If `customer_id` in the request body does not match the authenticated user's `customer_id`, return 403 with `forbidden`.
- A customer role user cannot submit `type = 'onboarding'` — return 403 with `forbidden`.
- `phone_repair` and `phone_replacement` require `phone_id`. If missing, return 422 with `phone_id_required`.
- `sim_topup` requires `sim_card_id`. If missing, return 422 with `sim_card_id_required`.
- If `phone_id` is provided, the phone must belong to the `customer_id` in the request. If not, return 422 with `asset_belongs_to_different_customer`.
- If `sim_card_id` is provided, the SIM must belong to the `customer_id` in the request. Same error if not.
- A new request is created with `status = 'submitted'` and `author` set based on the authenticated role: `'customer'` or `'company'`.
- `POST /requests` creation is not idempotent — two identical calls create two request rows.
- Status transitions: `submitted → in_progress → done`. Backwards transitions are forbidden. Return 422 with `invalid_status_transition` for any forbidden transition (e.g., `done → in_progress`, `done → submitted`, `in_progress → submitted`).
- When status transitions to `done`: set `done_at = now()` in the same transaction that updates the status.
- `time_spent_minutes` is computed on read: `EXTRACT(EPOCH FROM (done_at - created_at)) / 60` rounded to integer. Returns null if `done_at` is null. This field is omitted from the response for company and customer roles — only included in admin responses.
- When status transitions to `done`, emit `RequestStatusChangedEvent`. The `PhoneService` and `SimCardService` listeners apply the asset side-effects (see Phone and SIM card rules above). All side-effects execute in a separate transaction — if they fail, they are logged and retried (request itself remains done).
- Part rows (`request_parts`) are scoped to a request — a part cannot exist without its parent request.
- Attachment MIME types are validated at upload time: only `image/jpeg`, `image/png`, `image/webp` are accepted. Any other MIME type returns 422 with `unsupported_file_type`. File size over 10 MB returns 413 with `file_too_large`.
- Customer role users can upload attachments only to requests where `customer_id` matches their own `customer_id`. If not, return 403 with `forbidden`.
- File upload is not idempotent — each call to `POST /requests/{id}/attachments` creates a new attachment record and uploads a new object to MinIO even if the file is identical.

### Invoice rules

- Invoice number is assigned from a PostgreSQL sequence (`invoice_number_seq`). Gaps are acceptable (sequence does not roll back on transaction failure).
- Only one invoice per `(period_month, period_year)` pair is allowed. The unique constraint is on `(period_month, period_year)` on the `invoices` table. `GET /invoices/current` creates the draft if none exists — this creation is idempotent: concurrent calls do not create duplicate rows (use INSERT … ON CONFLICT DO NOTHING and re-fetch).
- `support_expenses` computation at generation time: sum of all SIM fees + all done request fees for the billing period. SIM fee per card: if `sim_monthly_billing` row exists for `(sim_card_id, period_month, period_year)`, use `actual_amount`; otherwise use `sim_cards.base_monthly_fee`. Include all SIM cards belonging to customers with `status != 'cancelled'` at any point during the period. Request fees: sum of `requests.fee` for requests with `status = 'done'` and `done_at` within the period where `fee IS NOT NULL`.
- `rolling_advance_previous`: look up the invoice for the previous month. If it exists, use its `rolling_advance_current`. If no previous invoice exists, use `0`.
- `previous_balance`: look up the most recent invoice before the current period. If its `status != 'paid'`, use its `total`. If it is `paid` or does not exist, use `0`.
- `total` formula: `support_fees + support_expenses + rolling_advance_previous - rolling_advance_current + previous_balance + taxes`. All computed fields are frozen at generation time (stored, never re-computed from live data).
- A draft invoice's editable fields: admin can update `support_fees` and `rolling_advance_current`. Company can update only `rolling_advance_current`. An update to either field does NOT recompute `total` automatically — admin must re-save or the UI recomputes client-side. An explicit recompute endpoint is not needed for MVP.
- `PATCH /invoices/{id}` returns 422 with `invoice_not_editable` if the invoice is not in `draft` status.
- If a company role user attempts to update `support_fees` via `PATCH /invoices/{id}`, return 403 with `forbidden`.
- `POST /invoices/{id}/send`: invoice must be in `draft` status (else 422 `invoice_not_draft`). On success: (1) set status = `sent`, (2) generate PDF synchronously (Thymeleaf + OpenPDF), (3) store PDF in MinIO, (4) emit `InvoiceSentEvent` (WhatsApp notification dispatched by listener). All three steps are attempted in this order. If PDF generation fails, the status transition is rolled back and a 500 is returned. If MinIO storage fails, same rollback. If WhatsApp dispatch fails, it is logged — the invoice remains `sent` (notification failure does not roll back status).
- `POST /invoices/{id}/mark-paid`: invoice must be in `sent` status (else 422 `invoice_not_sent`). Sets status = `paid`. This transition has no side-effects beyond the status update.
- `GET /invoices/{id}/pdf`: only available for `sent` or `paid` invoices (else 422 `pdf_not_available`). Streams the PDF directly from MinIO. The PDF storage key is derived from the invoice id.

> **Data model gap:** The `invoices` table in `docs/architecture.md` does not include a `pdf_storage_key` column. The backend spec adds: `pdf_storage_key VARCHAR` — set when invoice transitions to `sent`.

> **Data model gap:** `SYSTEM_SETTINGS` does not include a company WhatsApp group ID. Add `company_whatsapp_group_id VARCHAR` to `system_settings` for invoice-sent notifications and monthly cost summary dispatch.

### WhatsApp notification rules

- Notifications are fire-and-forget: delivery failure does not roll back the triggering operation. Failed dispatches are logged at WARN level with the error and the event that triggered them.
- Each notification type maps to one pre-approved WhatsApp Business message template. Template parameters must exactly match the approved template variable count and order.
- Notification triggers and targets:
  - `RequestCreatedEvent` → send to `customers.whatsapp_group_id` for the request's `customer_id`
  - `RequestStatusChangedEvent` → send to `customers.whatsapp_group_id` for the request's `customer_id`
  - `InvoiceSentEvent` → send to `system_settings.company_whatsapp_group_id`
  - Monthly cost summary (scheduled job, month-end) → send to each customer's `whatsapp_group_id`
- If `whatsapp_group_id` is null or blank for a customer, skip notification and log at INFO level.

### Dashboard stats rules

- `total_customers`: `COUNT(*)` from `customers` table — all customers.
- `total_phones`: `COUNT(*)` from `phones` where `status != 'replaced'`.
- `total_sim_cards`: `COUNT(*)` from `sim_cards` where `status != 'cancelled'`.
- `open_requests`: `COUNT(*)` from `requests` where `status != 'done'`.
- Company role sees the same stats as admin — no scoping difference.

### Cost breakdown rules

- `GET /customers/{id}/cost-breakdown` requires `month` and `year` query params. Both are required — return 422 with `missing_period` if either is absent.
- SIM fees: for each SIM card belonging to the customer with `status != 'cancelled'`, compute fee for the period. If `sim_monthly_billing` exists for `(sim_card_id, month, year)`, use `actual_amount` and set `is_actual = true`. Otherwise use `base_monthly_fee` and set `is_actual = false`.
- Request fees: all requests for this customer with `status = 'done'` where `done_at` falls in the requested period and `fee IS NOT NULL`.
- `total` = sum of all SIM fee amounts + sum of all request fee amounts.
- Customer role: the `customer_id` in the path must match the authenticated user's `customer_id`; else return 403 with `forbidden`.

---

## Data layer

### Auth data access

**ORM strategy:** JPA + Hibernate — simple token lookups and inserts.

**Entities owned:**
- `RefreshToken` — maps to table `refresh_tokens` (not in architecture data model — new table)

**Refresh token table:**
```
refresh_tokens(id UUID PK, user_id UUID FK users.id, token_hash VARCHAR UNIQUE, expires_at TIMESTAMP, created_at TIMESTAMP)
```
Token is stored as a SHA-256 hash (not plaintext) so the table contents are not directly exploitable if leaked.

**Key queries:**
- Find by token hash: JPQL `SELECT t FROM RefreshToken t WHERE t.tokenHash = :hash AND t.expiresAt > NOW()`
- Delete by token hash: JPQL delete query
- Delete all by user_id: on logout (belt-and-suspenders cleanup)

**Required indexes:**
- `refresh_tokens(token_hash)` — unique index; lookup on every refresh
- `refresh_tokens(user_id)` — for cleanup on logout

**Transactions:**
- Token rotation: single transaction covering delete of old token + insert of new token

---

### User data access

**ORM strategy:** JPA + Hibernate — CRUD with unique constraint.

**Entities owned:**
- `User` — maps to table `users` (extended with `is_active`, `name` columns per gap note above)

**Key queries:**
- Find by email (case-insensitive): JPQL `SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)`
- Find all with optional role filter: Spring Data `findByRole(role, pageable)` or `findAll(pageable)`

**Required indexes:**
- `users(email)` — unique index; lookup on every login and on email uniqueness check
- `users(customer_id)` — for bulk queries by customer

**Transactions:**
- Create user: single transaction

---

### Customer data access

**ORM strategy:** jOOQ — `CustomerSummary` requires aggregated sub-counts and cost computation that spans four tables; jOOQ produces tighter SQL.

**Entities owned:**
- `Customer` — maps to table `customers`

**Key queries:**
- Customer list with summary stats: single jOOQ SELECT with lateral or correlated subqueries for phone_count, sim_card_count, open_request_count, current_month_cost
- Customer detail by id: simple JPQL fetch
- Name search: jOOQ `ILIKE '%' || search || '%'`

**Required indexes:**
- `customers(name)` — for name search (consider pg_trgm GIN index if search is slow)

**Transactions:**
- Create/update customer: single transaction

---

### Phone data access

**ORM strategy:** JPA + Hibernate — standard CRUD.

**Entities owned:**
- `Phone` — maps to table `phones`

**Key queries:**
- Phones by customer (with optional status filter): Spring Data `findByCustomerIdAndStatusNot(customerId, 'replaced', sort)`
- Find phone by id with customer ownership check: JPQL `SELECT p FROM Phone p WHERE p.id = :id AND p.customerId = :customerId`
- Check if phone has assigned SIM: `SELECT COUNT(*) FROM sim_cards WHERE phone_id = :phoneId AND status != 'cancelled'`

**Required indexes:**
- `phones(customer_id)` — list phones by customer
- `phones(customer_id, status)` — filter by customer + status

**Transactions:**
- Phone replacement side-effect: single transaction covering status update of old phone + insert of new phone

---

### SIM card data access

**ORM strategy:** JPA + Hibernate — standard CRUD; upsert for monthly billing.

**Entities owned:**
- `SimCard` — maps to table `sim_cards`
- `SimMonthlyBilling` — maps to table `sim_monthly_billing`

**Key queries:**
- SIM cards by customer: Spring Data `findByCustomerId(customerId, sort)` with optional cancelled filter
- SIM card by id with customer ownership check: JPQL with customer_id validation
- Check if phone already has SIM assigned: `SELECT COUNT(*) FROM sim_cards WHERE phone_id = :phoneId AND status != 'cancelled'`
- Upsert monthly billing: native query `INSERT INTO sim_monthly_billing … ON CONFLICT (sim_card_id, period_month, period_year) DO UPDATE SET actual_amount = EXCLUDED.actual_amount`

**Required indexes:**
- `sim_cards(customer_id)` — list by customer
- `sim_cards(phone_id)` — check phone assignment
- `sim_monthly_billing(sim_card_id, period_month, period_year)` — unique index (enforces one record per SIM per period); also primary lookup

**Transactions:**
- SIM assignment update: single transaction (update phone_id + status together)
- Monthly billing upsert: single transaction

---

### Request data access

**ORM strategy:** JPA + Hibernate for CRUD; jOOQ for filtered paginated list (multi-column filter across joined tables).

**Entities owned:**
- `Request` — maps to table `requests`
- `RequestPart` — maps to table `request_parts`
- `Attachment` — maps to table `attachments`

**Key queries:**
- Paginated filtered request list: jOOQ SELECT with optional WHERE clauses on status, type, customer_id, author; joins customers table for `customer_name` in response
- Request detail with parts + attachments: JPQL with JOIN FETCH for `parts` and `attachments` collections
- Status + done_at update: JPQL `UPDATE Request r SET r.status = :status, r.doneAt = :doneAt WHERE r.id = :id`
- Attachment by request_id + attachment_id: JPQL with both IDs to prevent cross-request access

**Required indexes:**
- `requests(customer_id)` — scope by customer (customer role queries)
- `requests(status)` — filter by status
- `requests(customer_id, status)` — combined filter for open_request_count and customer-scoped list
- `requests(done_at)` — for cost/invoice period computations
- `attachments(request_id)` — list by request

**Transactions:**
- Status update to done: single transaction covering status = done + done_at = now() + event publish (Spring ApplicationEventPublisher publishes after commit via `@TransactionalEventListener`)

---

### Invoice data access

**ORM strategy:** jOOQ for `support_expenses` computation (multi-table join with conditional SIM billing logic); JPA for CRUD on invoice entity.

**Entities owned:**
- `Invoice` — maps to table `invoices` (extended with `pdf_storage_key` column per gap note above)

**Key queries:**
- Compute support_expenses: jOOQ SELECT joining `sim_cards`, `sim_monthly_billing`, `requests` with CASE expression for actual vs base fee
- Fetch previous invoice for rolling_advance_previous and previous_balance: `SELECT * FROM invoices WHERE period_year = :y AND period_month = :m ORDER BY created_at DESC LIMIT 1` (for previous period)
- Get or create draft for current month: native query with `INSERT … ON CONFLICT (period_month, period_year) DO NOTHING`
- Paginated invoice list ordered by period desc: Spring Data with Pageable + optional status filter

**Required indexes:**
- `invoices(period_year, period_month)` — unique index; lookup current/previous month invoice
- `invoices(status)` — filter by status

**Transactions:**
- Invoice send: single transaction covering status update + pdf_storage_key save; WhatsApp event published after commit
- Get-or-create draft: uses `ON CONFLICT DO NOTHING` + re-fetch; safe under concurrent access

---

### Settings data access

**ORM strategy:** JPA + Hibernate — single-row settings table.

**Entities owned:**
- `SystemSettings` — maps to table `system_settings`

**Key queries:**
- Fetch settings: `SELECT s FROM SystemSettings s` — expects exactly one row; if none exists, return empty defaults
- Replace settings: upsert pattern — find singleton row and update, or insert if first-time setup

**Required indexes:**
- None — single row, no filtering

---

## Auth implementation

**Authentication mechanism:** Self-built JWT (access token) + server-side refresh token

**Token strategy:**
- Storage: httpOnly, Secure, SameSite=Strict cookies — never accessible to JavaScript
- Access token TTL: 15 minutes (`Max-Age=900`)
- Access token cookie path: `/` (needed on all API calls)
- Refresh token TTL: 7 days (`Max-Age=604800`)
- Refresh token cookie path: `/api/v1/auth/refresh` (restricts automatic sending to refresh endpoint only)
- Refresh token storage: SHA-256 hash stored in `refresh_tokens` table; plaintext sent to client in cookie
- Invalidation: refresh token explicitly deleted from `refresh_tokens` table on logout or rotation; access token is short-lived and not explicitly revoked (acceptable for 15-minute window)

**Authorization model:** RBAC — three roles: `admin`, `company`, `customer`

**Role definitions:**

| Role | Permissions | Restrictions |
|------|-------------|--------------|
| admin | Full access to all endpoints, all data, all operations | Cannot deactivate own account |
| company | Read all customers, phones, SIMs, requests; submit any request type including onboarding; update `rolling_advance_current` on draft invoices; view and download invoices; view dashboard stats | Cannot see `time_spent_minutes` on requests; cannot access `GET /users`, `PUT /settings`, `GET /settings`; cannot send or mark invoices paid |
| customer | Scoped entirely to own `customer_id` from JWT; view own phones, SIMs, requests, cost breakdown; submit requests except onboarding; upload attachments | Cannot see other customers' data; cannot see `time_spent_minutes`; cannot access admin/company-only endpoints |

**Security rules:**
- Every authenticated endpoint extracts role and customer_id from the JWT claim — no additional DB call for authorization on every request.
- A customer role user's `customer_id` JWT claim is set at login time and does not change within the token lifetime. The token must be re-issued (re-login or refresh) if `customer_id` changes.
- A 401 response clears both auth cookies (access_token and refresh_token) in the response headers to prevent stale token accumulation.
- The global security filter rejects any request to an authenticated endpoint without a valid access token before it reaches the controller.

---

## Background jobs

---

### MonthlyCostSummaryJob

**Trigger:** Scheduled cron — `0 8 1 * *` (1st of each month, 08:00 UTC) — sends summary for the previous month
**Purpose:** For each customer, compute the cost breakdown for the just-completed month and send a WhatsApp summary message to the customer's `whatsapp_group_id`.
**Failure strategy:** Single retry after 10 minutes if the batch fails. Individual customer failures are caught and logged — one failed customer does not abort the batch for remaining customers.
**Idempotency:** Dispatch is not deduplicated — if the job runs twice (e.g., due to scheduler restart), two WhatsApp messages are sent. Acceptable for MVP. Track job execution in a `job_executions` table if deduplication is required later.
**Side effects:** Reads `customers`, `sim_cards`, `sim_monthly_billing`, `requests` tables. No writes. Dispatches WhatsApp messages via WhatsApp Business API.

---

## Error handling strategy

**Error classification:**
- `4xx` client errors: thrown as typed exceptions from the service layer (e.g., `NotFoundException`, `ForbiddenException`, `ConflictException`, `UnprocessableEntityException`), each carrying an error code string. Caught by the global exception handler, mapped to the standard error response shape.
- `5xx` server errors: unhandled exceptions propagate to the global exception handler, which logs at ERROR level with full stack trace and returns 500 with `internal_server_error` code. No internal error detail is exposed to the client.
- Validation errors: Spring Bean Validation (`@Valid` on request DTOs) catches structural errors. The global handler catches `MethodArgumentNotValidException` and returns 422 with field-level details in the `details` map.

**Global exception handler:**
- Location: `com.tetramobile.tetra.shared.exception.GlobalExceptionHandler`
- Catches:
  - `NotFoundException` → 404 `not_found`
  - `ForbiddenException` → 403 (with caller-provided error code)
  - `UnauthorizedException` → 401 (with caller-provided error code)
  - `ConflictException` → 409 (with caller-provided error code)
  - `UnprocessableEntityException` → 422 (with caller-provided error code)
  - `MethodArgumentNotValidException` → 422 with field errors in `details`
  - `MaxUploadSizeExceededException` → 413 `file_too_large`
  - All others → 500 `internal_server_error`

**Logging strategy:**
- ERROR: unhandled exceptions, PDF generation failures, MinIO failures
- WARN: WhatsApp dispatch failures, refresh token rotation conflicts
- INFO: successful login/logout, invoice status transitions, request status transitions
- DEBUG: token validation details, query parameters (never log sensitive values)
- Sensitive data that must never be logged: passwords, JWT payloads, refresh token values, IBAN/SWIFT, WhatsApp group IDs

---

## Observability

**Health check endpoint:** `GET /actuator/health` — Spring Boot Actuator with DB connectivity check
**Metrics:** Request count and latency via Micrometer (auto-configured by Spring Boot Actuator); DB connection pool size via HikariCP metrics; MinIO call latency via custom timer
**Tracing:** Not implemented for MVP — deferred to infrastructure spec
**Alerts:** Deferred to `specs/infrastructure.md` — alert conditions include: 5xx rate > 1%, DB pool exhaustion, MinIO connectivity failure, WhatsApp dispatch failure rate > 10% per batch
