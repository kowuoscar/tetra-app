# Architecture

## System context

Tetra Billing Dashboard is an internal web application for Tetra Mobile Solutions FZ-LLC. It lets three roles — Admin (Oscar), Company (Tetra), and Customers — track mobile phones and SIM cards, submit and manage service requests, and generate monthly invoices. The admin is the central operator: they onboard customers, manage assets, process requests, and produce invoices. The company can submit requests on behalf of customers and view billing. Customers view their own assets, requests, and monthly costs.

The system consists of a Next.js frontend, a Spring Boot API backend, a PostgreSQL database, and MinIO object storage for attachments. Automated WhatsApp messages are sent via the WhatsApp Business API on key events. Monthly invoices are generated as PDFs by the backend using Thymeleaf templates rendered to PDF via OpenPDF.

---

## Component map

| Component | Type | Responsibility |
|-----------|------|----------------|
| Web client | Next.js (TypeScript) | Serves all three role dashboards; handles auth token storage in httpOnly cookies |
| API server | Spring Boot (Java) | All business logic, data access, JWT issuance, PDF generation, WhatsApp dispatch |
| Database | PostgreSQL | Primary data store for all entities |
| Object storage | MinIO | Stores request photo attachments; API server reads/writes via S3-compatible SDK |
| WhatsApp gateway | WhatsApp Business API (Meta) | Receives send requests from API server; delivers messages to customer WhatsApp groups |

---

## Data flows

### Authentication
1. User submits email + password to `POST /auth/login`
2. API server validates credentials against `users` table (bcrypt comparison)
3. API server issues short-lived JWT access token (15 min) + long-lived refresh token (7 days)
4. Both tokens set as httpOnly, Secure, SameSite=Strict cookies on the response
5. Subsequent requests include access token cookie; API server validates and extracts role + customer_id on every request
6. On access token expiry, client calls `POST /auth/refresh` with refresh token cookie; server issues new access token and rotates refresh token

### Request submission
1. Customer or company submits request form; client calls `POST /requests`
2. API server validates: referenced phone/SIM belongs to the target customer; request type is permitted for the submitting role
3. Request row created with status `submitted`, `author` set to submitting role
4. API server dispatches WhatsApp message to customer's `whatsapp_group_id` via WhatsApp Business API
5. Response returned to client

### Request status update (admin)
1. Admin updates request status via `PATCH /requests/{id}`
2. If status transitions to `done`, API server sets `done_at = now()`
3. WhatsApp notification dispatched to customer's WhatsApp group
4. Asset side-effects applied based on request type:
   - `phone_repair` → phone status → `active`
   - `phone_replacement` → old phone status → `replaced`; new Phone row created as `active` with no SIM (flagged unused)
   - `new_sim` → new SimCard row created with status `unassigned` (flagged unused)
   - `sim_topup`, `manual_support`, `onboarding` → no asset change

### File attachment upload
1. Client calls `POST /requests/{id}/attachments` with multipart file
2. API server validates role access to the request and file MIME type (images only)
3. File streamed to MinIO; storage key saved in `attachments` table
4. Attachment metadata returned to client

### Invoice generation
1. Admin triggers `POST /invoices/generate` for a given month/year
2. API server computes:
   - `support_expenses`: sum of all request fees + SIM fees for the period (using `sim_monthly_billing.actual_amount` for postpaid SIMs where available, else `sim_cards.base_monthly_fee`)
   - `rolling_advance_previous`: `rolling_advance_current` from the previous invoice record
   - `previous_balance`: `total` of the previous invoice if its status is not `paid`, else 0
3. Invoice row created with status `draft`; all computed fields stored (frozen at generation time)
4. Admin reviews and adjusts `support_fees` and `rolling_advance_current` as needed
5. Admin calls `POST /invoices/{id}/send`; API server generates PDF via Thymeleaf + OpenPDF using `system_settings` for bank details
6. Invoice status → `sent`; WhatsApp notification dispatched to company

### WhatsApp notification dispatch
1. API server event triggers notification (request created, request status changed, invoice sent, monthly cost summary at month-end)
2. API server calls WhatsApp Business API with approved message template + customer's `whatsapp_group_id` and template variables
3. WhatsApp delivers message to group; no inbound message processing (send-only)

---

## Data model

```erDiagram
    USER {
        uuid id PK
        string email
        string password_hash
        string role "admin|company|customer"
        uuid customer_id FK "nullable - set for customer role only"
        timestamp created_at
    }
    CUSTOMER {
        uuid id PK
        string name
        string contact_info
        string whatsapp_group_id
        timestamp created_at
    }
    PHONE {
        uuid id PK
        string model
        string ownership "customer|company"
        uuid customer_id FK
        string status "active|in_repair|replaced"
        timestamp created_at
    }
    SIM_CARD {
        uuid id PK
        string type "prepaid|postpaid"
        string provider "FREE|ORANGE|BOUYGUES|SFR|CORIOLIS — nullable for existing rows, required via API"
        string number "FR mobile MSISDN — nullable for existing rows, required via API"
        decimal base_monthly_fee
        uuid customer_id FK
        uuid phone_id FK "nullable - SIM can exist without a phone"
        string status "active|unassigned|cancelled"
        timestamp created_at
    }
    REQUEST {
        uuid id PK
        string type "phone_repair|phone_replacement|sim_topup|new_sim|manual_support|onboarding"
        string status "submitted|in_progress|done"
        uuid customer_id FK
        uuid phone_id FK "nullable"
        uuid sim_card_id FK "nullable"
        string author "customer|company"
        decimal fee "nullable - set by admin"
        timestamp created_at
        timestamp done_at "nullable - set when status transitions to done"
    }
    REQUEST_PART {
        uuid id PK
        uuid request_id FK
        string description
        decimal cost
    }
    ATTACHMENT {
        uuid id PK
        uuid request_id FK
        string storage_key "MinIO object key"
        uuid uploaded_by_user_id FK
        timestamp created_at
    }
    INVOICE {
        uuid id PK
        int invoice_number "auto-incremented PostgreSQL sequence"
        int period_month
        int period_year
        decimal support_fees "base salary - entered by admin"
        decimal support_expenses "stored at generation time"
        decimal rolling_advance_current "entered by admin or company"
        decimal rolling_advance_previous "stored at generation time from prior invoice"
        decimal previous_balance "stored at generation time"
        decimal taxes "always 0 for MVP"
        decimal total "stored at generation time"
        string status "draft|sent|paid"
        timestamp created_at
    }
    SIM_MONTHLY_BILLING {
        uuid id PK
        uuid sim_card_id FK
        int period_month
        int period_year
        decimal actual_amount "postpaid only - entered by admin at month-end"
    }
    SYSTEM_SETTINGS {
        uuid id PK
        string bank_account_holder
        string bank_iban
        string bank_swift
        string company_name "invoice recipient name"
        string company_address "invoice recipient address"
    }

    USER }o--o| CUSTOMER : "belongs to"
    CUSTOMER ||--o{ PHONE : "has"
    CUSTOMER ||--o{ SIM_CARD : "has"
    SIM_CARD }o--o| PHONE : "assigned to"
    CUSTOMER ||--o{ USER : "has users"
    REQUEST }o--|| CUSTOMER : "attributed to"
    REQUEST }o--o| PHONE : "targets"
    REQUEST }o--o| SIM_CARD : "targets"
    REQUEST ||--o{ REQUEST_PART : "has"
    REQUEST ||--o{ ATTACHMENT : "has"
    SIM_CARD ||--o{ SIM_MONTHLY_BILLING : "has"
```

---

## Auth strategy

- **Mechanism:** Self-built JWT — access token (15 min TTL) + refresh token (7 days TTL), signed with server secret
- **Storage:** Both tokens in httpOnly, Secure, SameSite=Strict cookies — no localStorage, no sessionStorage
- **Authorisation model:** RBAC with three roles:
  - `admin` — full access to all data and all operations including time tracking and settings
  - `company` — read access to all customers; can submit any request type; manages rolling advance; views invoices; no time tracking visibility
  - `customer` — scoped to own customer's data only; cannot see base salary, time tracking, or other customers
- **Scope enforcement:** API server validates role on every endpoint; `customer`-role requests additionally scope all queries by the authenticated user's `customer_id`
- **Token refresh:** Refresh token rotated on every use (new token issued, old invalidated); on logout both tokens cleared
- **Admin and company users:** `customer_id` is null on their `USER` rows; role field drives access control
- **User provisioning:** Admin creates all user accounts directly (sets email + initial password); no email invite flow

---

## External dependencies

| Service | Purpose | Integration point |
|---------|---------|-------------------|
| WhatsApp Business API (Meta) | Send automated messages to customer WhatsApp groups | API server via HTTPS calls using pre-approved message templates and stored `whatsapp_group_id` per customer |
| MinIO | Object storage for request photo attachments | API server via AWS Java SDK (S3-compatible) |

---

## Key technical decisions

| Decision | Choice | Rationale | Alternatives considered |
|----------|--------|-----------|------------------------|
| Auth strategy | Self-built JWT (httpOnly cookies) | No external service dependency; fits single-tenant tool at this scale; full control over token lifecycle | Keycloak (infra overhead), Auth.js (Next.js-only, incompatible with Spring Boot backend), Supabase Auth (external dependency) |
| File storage | MinIO | S3-compatible, self-hosted on existing Hetzner cluster, no external cost or vendor dependency | AWS S3 (external cost), Cloudflare R2 (external dependency), local disk (incompatible with k8s ephemeral pods) |
| PDF generation | Thymeleaf + OpenPDF | In-JVM generation, no extra container or service, easy HTML template styling for invoice layout, LGPL licensed | iText7 (commercial license), JasperReports (heavy, overkill for single template), Headless Chrome (extra sidecar container) |
| Time tracking | Auto-calculated (`done_at − created_at`) | System has all required timestamps; no manual entry error; time is always accurate relative to request lifecycle | Manual `time_spent_minutes` field (error-prone, unnecessary) |
| Customer user model | Separate `User` + `Customer` entities | Supports multiple logins per customer account; clean separation of identity (`User`) from business entity (`Customer`) | Single shared credentials per customer (no individual audit trail, no per-user accountability) |
| User provisioning | Admin creates accounts directly | No email infrastructure required; credential sharing via existing WhatsApp workflow fits operational context | Email invite flow (adds SMTP dependency and complexity) |
| API style | REST | Standard CRUD operations throughout; no complex client-driven querying that would benefit from GraphQL | GraphQL (no requirement for flexible querying; adds complexity) |
| Backend language | Java | Explicitly stated in vision.md | Kotlin |
| Invoice computed fields | Stored at generation time | Invoice total must not change after sending regardless of future data changes; preserves billing history integrity | Computed on the fly (total would shift if requests or SIM fees were edited after invoice sent) |

---

## Risks and open questions

| Item | Type | Notes | Must resolve by |
|------|------|-------|----------------|
| WhatsApp Business API setup | Assumption | Requires verified Meta Business account and approved message templates; system cannot send notifications without these | Before WhatsApp integration sprint |
| MinIO provisioning | Open question | MinIO must be deployed on the k8s cluster; addressed in infrastructure spec (step 4c) | Step 4c |
| Scale ceiling | Assumption | Designed for single region, <100 customers, no horizontal scaling built in; architecture is not wrong at this scale but would need revisiting if customer count grows significantly | Before customer count exceeds 100 |
| Postpaid actual amount for current period | Implementation detail | System uses `sim_monthly_billing.actual_amount` if present for the invoice period, else falls back to `base_monthly_fee`; admin enters actual amount before generating the invoice | Step 4b |
| Invoice sequential number gaps | Implementation detail | PostgreSQL sequence guarantees uniqueness and order but not gap-free numbering (gaps possible on rollback); acceptable for this use case | Step 4b |
