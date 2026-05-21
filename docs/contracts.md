# API contracts

## Conventions

- **Base URL:** `/api/v1`
- **API style:** REST
- **Authentication:** JWT stored in httpOnly, Secure, SameSite=Strict cookies. Access token cookie name: `access_token`. Refresh token cookie name: `refresh_token`. Tokens are set by the server via `Set-Cookie` headers — the client never reads them directly.
- **Date format:** ISO 8601 — `2026-05-14T10:30:00Z`
- **ID format:** UUID v4
- **Pagination:** Page-based. Query params: `page` (0-indexed, default 0), `size` (default 20, max 100). All list responses follow the `PagedResponse` shape defined in Shared types.
- **Currency:** All monetary amounts are `number` (decimal, 2 places) in EUR.
- **Role enforcement:** The API server reads the authenticated user's role and `customer_id` from the JWT on every request. Endpoints marked `customer` scope all data to the authenticated user's `customer_id` automatically — no client-side filtering is needed or trusted.

### Standard error response

All errors return this shape:

```json
{
  "error": {
    "code": "snake_case_error_code",
    "message": "Human-readable sentence",
    "details": {}
  }
}
```

---

## Shared types

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {

    "PagedResponse": {
      "type": "object",
      "required": ["content", "total_elements", "total_pages", "page", "size"],
      "properties": {
        "content":        { "type": "array" },
        "total_elements": { "type": "integer" },
        "total_pages":    { "type": "integer" },
        "page":           { "type": "integer" },
        "size":           { "type": "integer" }
      }
    },

    "UserSummary": {
      "type": "object",
      "required": ["id", "email", "name", "role", "created_at"],
      "properties": {
        "id":          { "type": "string", "format": "uuid" },
        "email":       { "type": "string", "format": "email" },
        "name":        { "type": "string" },
        "role":        { "type": "string", "enum": ["admin", "company", "customer"] },
        "customer_id": { "type": ["string", "null"], "format": "uuid" },
        "is_active":   { "type": "boolean" },
        "created_at":  { "type": "string", "format": "date-time" }
      }
    },

    "CustomerSummary": {
      "type": "object",
      "required": ["id", "name", "phone_count", "sim_card_count", "open_request_count", "current_month_cost", "created_at"],
      "properties": {
        "id":                  { "type": "string", "format": "uuid" },
        "name":                { "type": "string" },
        "contact_info":        { "type": ["string", "null"] },
        "phone_count":         { "type": "integer" },
        "sim_card_count":      { "type": "integer" },
        "open_request_count":  { "type": "integer" },
        "current_month_cost":  { "type": "number" },
        "created_at":          { "type": "string", "format": "date-time" }
      }
    },

    "CustomerDetail": {
      "allOf": [{ "$ref": "#/definitions/CustomerSummary" }],
      "properties": {
        "whatsapp_group_id": { "type": ["string", "null"], "description": "Optional — null until set by admin" }
      }
    },

    "PhoneSummary": {
      "type": "object",
      "required": ["id", "model", "ownership", "status", "customer_id", "is_unused", "created_at"],
      "properties": {
        "id":          { "type": "string", "format": "uuid" },
        "model":       { "type": "string" },
        "ownership":   { "type": "string", "enum": ["customer", "company"] },
        "status":      { "type": "string", "enum": ["active", "in_repair", "replaced"] },
        "customer_id": { "type": "string", "format": "uuid" },
        "sim_card": {
          "type": ["object", "null"],
          "properties": {
            "id":               { "type": "string", "format": "uuid" },
            "type":             { "type": "string", "enum": ["prepaid", "postpaid"] },
            "provider":         { "type": ["string", "null"], "enum": ["FREE", "ORANGE", "BOUYGUES", "SFR", "CORIOLIS", null] },
            "number":           { "type": ["string", "null"] },
            "base_monthly_fee": { "type": "number" }
          }
        },
        "is_unused":   { "type": "boolean", "description": "true when status is active/in_repair and no SIM assigned" },
        "created_at":  { "type": "string", "format": "date-time" }
      }
    },

    "SimCardSummary": {
      "type": "object",
      "required": ["id", "type", "base_monthly_fee", "status", "customer_id", "is_unused", "created_at"],
      "properties": {
        "id":               { "type": "string", "format": "uuid" },
        "type":             { "type": "string", "enum": ["prepaid", "postpaid"] },
        "provider":         { "type": ["string", "null"], "enum": ["FREE", "ORANGE", "BOUYGUES", "SFR", "CORIOLIS", null], "description": "SIM provider. Nullable for legacy rows created before this field was added." },
        "number":           { "type": ["string", "null"], "description": "FR mobile MSISDN. Format: 0[67]\\d{8} or +33[67]\\d{8}. Nullable for legacy rows." },
        "base_monthly_fee": { "type": "number" },
        "status":           { "type": "string", "enum": ["active", "unassigned", "cancelled"] },
        "customer_id":      { "type": "string", "format": "uuid" },
        "phone_id":         { "type": ["string", "null"], "format": "uuid" },
        "is_unused":        { "type": "boolean", "description": "true when status is active/unassigned and phone_id is null" },
        "created_at":       { "type": "string", "format": "date-time" }
      }
    },

    "RequestPart": {
      "type": "object",
      "required": ["id", "description", "cost"],
      "properties": {
        "id":          { "type": "string", "format": "uuid" },
        "description": { "type": "string" },
        "cost":        { "type": "number" }
      }
    },

    "AttachmentSummary": {
      "type": "object",
      "required": ["id", "uploaded_by_user_id", "created_at"],
      "properties": {
        "id":                   { "type": "string", "format": "uuid" },
        "uploaded_by_user_id":  { "type": "string", "format": "uuid" },
        "created_at":           { "type": "string", "format": "date-time" }
      }
    },

    "RequestSummary": {
      "type": "object",
      "required": ["id", "type", "status", "customer_id", "author", "created_at"],
      "properties": {
        "id":           { "type": "string", "format": "uuid" },
        "type":         { "type": "string", "enum": ["phone_repair", "phone_replacement", "sim_topup", "new_sim", "manual_support", "onboarding"] },
        "status":       { "type": "string", "enum": ["submitted", "in_progress", "done"] },
        "customer_id":  { "type": "string", "format": "uuid" },
        "customer_name":{ "type": "string" },
        "phone_id":     { "type": ["string", "null"], "format": "uuid" },
        "sim_card_id":  { "type": ["string", "null"], "format": "uuid" },
        "author":       { "type": "string", "enum": ["customer", "company"] },
        "fee":          { "type": ["number", "null"] },
        "created_at":   { "type": "string", "format": "date-time" },
        "done_at":      { "type": ["string", "null"], "format": "date-time" }
      }
    },

    "RequestDetail": {
      "allOf": [{ "$ref": "#/definitions/RequestSummary" }],
      "properties": {
        "parts":           { "type": "array", "items": { "$ref": "#/definitions/RequestPart" } },
        "attachments":     { "type": "array", "items": { "$ref": "#/definitions/AttachmentSummary" } },
        "time_spent_minutes": { "type": ["integer", "null"], "description": "Computed from created_at to done_at. Null if request not yet done. Admin-only — omitted from company and customer responses." }
      }
    },

    "InvoiceSummary": {
      "type": "object",
      "required": ["id", "invoice_number", "period_month", "period_year", "total", "status", "created_at"],
      "properties": {
        "id":             { "type": "string", "format": "uuid" },
        "invoice_number": { "type": "integer" },
        "period_month":   { "type": "integer", "minimum": 1, "maximum": 12 },
        "period_year":    { "type": "integer" },
        "total":          { "type": "number" },
        "status":         { "type": "string", "enum": ["draft", "sent", "paid"] },
        "created_at":     { "type": "string", "format": "date-time" }
      }
    },

    "InvoiceDetail": {
      "allOf": [{ "$ref": "#/definitions/InvoiceSummary" }],
      "properties": {
        "support_fees":               { "type": "number" },
        "support_expenses":           { "type": "number" },
        "rolling_advance_current":    { "type": "number" },
        "rolling_advance_previous":   { "type": "number" },
        "previous_balance":           { "type": "number" },
        "taxes":                      { "type": "number" }
      }
    },

    "CostBreakdown": {
      "type": "object",
      "required": ["period_month", "period_year", "sim_fees", "request_fees", "total"],
      "properties": {
        "period_month":  { "type": "integer" },
        "period_year":   { "type": "integer" },
        "sim_fees": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "sim_card_id":    { "type": "string", "format": "uuid" },
              "sim_card_type":  { "type": "string", "enum": ["prepaid", "postpaid"] },
              "amount":         { "type": "number" },
              "is_actual":      { "type": "boolean", "description": "true if this is the admin-entered actual amount for a postpaid SIM, false if it is the base monthly fee" }
            }
          }
        },
        "request_fees": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "request_id":   { "type": "string", "format": "uuid" },
              "request_type": { "type": "string" },
              "amount":       { "type": "number" }
            }
          }
        },
        "total": { "type": "number" }
      }
    },

    "SystemSettings": {
      "type": "object",
      "required": ["bank_account_holder", "bank_iban", "bank_swift", "company_name", "company_address"],
      "properties": {
        "bank_account_holder": { "type": "string" },
        "bank_iban":           { "type": "string" },
        "bank_swift":          { "type": "string" },
        "company_name":        { "type": "string", "description": "Invoice recipient name" },
        "company_address":     { "type": "string", "description": "Invoice recipient address" }
      }
    }

  }
}
```

---

## Endpoints

---

### POST /auth/login

**Description:** Authenticates a user and sets httpOnly JWT cookies.
**Auth required:** No
**Interaction:** 1 — User logs in with email + password

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["email", "password"],
  "properties": {
    "email":    { "type": "string", "format": "email" },
    "password": { "type": "string" }
  }
}
```

**Response — 200**

Sets `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=900` and `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "user": { "$ref": "#/definitions/UserSummary" }
  }
}
```

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `invalid_credentials` | Email not found or password incorrect |
| 403 | `account_deactivated` | User account has been deactivated |

---

### POST /auth/refresh

**Description:** Issues a new access token using the refresh token cookie. Rotates the refresh token.
**Auth required:** No (uses refresh token cookie)
**Interaction:** 2 — User refreshes expired access token

**Request body:** None

**Response — 200**

Sets new `access_token` cookie and rotated `refresh_token` cookie.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "user": { "$ref": "#/definitions/UserSummary" }
  }
}
```

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `invalid_refresh_token` | Refresh token missing, expired, or already rotated |

---

### DELETE /auth/session

**Description:** Logs the user out by clearing both auth cookies.
**Auth required:** Yes (any role)
**Interaction:** 3 — User logs out

**Request body:** None

**Response — 204:** No content. Clears `access_token` and `refresh_token` cookies.

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid access token |

---

### GET /users

**Description:** Lists all user accounts in the system.
**Auth required:** Yes (admin only)
**Interaction:** — (admin user management)

**Query params**
```json
{
  "type": "object",
  "properties": {
    "page": { "type": "integer", "default": 0 },
    "size": { "type": "integer", "default": 20, "maximum": 100 },
    "role": { "type": "string", "enum": ["admin", "company", "customer"] }
  }
}
```

**Response — 200:** `PagedResponse` with `content: UserSummary[]`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |

---

### POST /users

**Description:** Creates a new user account. Admin creates all accounts directly.
**Auth required:** Yes (admin only)
**Interaction:** 4 — Admin creates a new user account

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["email", "name", "password", "role"],
  "properties": {
    "email":       { "type": "string", "format": "email" },
    "name":        { "type": "string" },
    "password":    { "type": "string", "minLength": 8 },
    "role":        { "type": "string", "enum": ["company", "customer"] },
    "customer_id": { "type": "string", "format": "uuid", "description": "Required when role is customer" }
  }
}
```

**Response — 201:** `UserSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 409 | `email_already_in_use` | A user with this email already exists |
| 422 | `customer_id_required` | role is customer but customer_id not provided |
| 422 | `customer_not_found` | customer_id does not reference an existing customer |

---

### PATCH /users/{id}

**Description:** Updates a user's name, email, or password.
**Auth required:** Yes (admin only)
**Interaction:** 5 — Admin updates a user

**Path params:** `id` (UUID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name":     { "type": "string" },
    "email":    { "type": "string", "format": "email" },
    "password": { "type": "string", "minLength": 8 }
  }
}
```

**Response — 200:** `UserSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | User ID does not exist |
| 409 | `email_already_in_use` | Email is already taken by another user |

---

### DELETE /users/{id}

**Description:** Deactivates a user account (soft delete — sets is_active to false).
**Auth required:** Yes (admin only)
**Interaction:** 6 — Admin deactivates a user

**Path params:** `id` (UUID)

**Response — 204:** No content.

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | User ID does not exist |
| 422 | `cannot_deactivate_self` | Admin attempting to deactivate their own account |

---

### GET /dashboard/stats

**Description:** Returns high-level overview statistics for the dashboard header.
**Auth required:** Yes (admin, company)
**Interaction:** 7, 8 — Admin/company views overview stats

**Response — 200**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "total_customers":   { "type": "integer" },
    "total_phones":      { "type": "integer" },
    "total_sim_cards":   { "type": "integer" },
    "open_requests":     { "type": "integer" }
  }
}
```

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is customer role |

---

### GET /customers

**Description:** Returns a paginated list of customers with summary stats.
**Auth required:** Yes (admin, company)
**Interaction:** 10 — Admin/company views customer list

**Query params**
```json
{
  "type": "object",
  "properties": {
    "page":   { "type": "integer", "default": 0 },
    "size":   { "type": "integer", "default": 20, "maximum": 100 },
    "search": { "type": "string", "description": "Filters by customer name (case-insensitive, contains)" }
  }
}
```

**Response — 200:** `PagedResponse` with `content: CustomerSummary[]`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is customer role |

---

### POST /customers

**Description:** Creates a new customer record. Called when admin completes an onboarding request.
**Auth required:** Yes (admin only)
**Interaction:** 12 — Admin creates a customer

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name":               { "type": "string" },
    "contact_info":       { "type": "string", "description": "Optional — can be set later via PATCH" },
    "whatsapp_group_id":  { "type": "string", "description": "Optional — can be set later via PATCH. Required for WhatsApp notifications to fire." }
  }
}
```

**Response — 201:** `CustomerDetail`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |

---

### GET /customers/{id}

**Description:** Returns full customer detail. Customer role users may only fetch their own customer_id.
**Auth required:** Yes (admin, company, customer — own only)
**Interaction:** 11 — Views customer detail; 9 — Customer views own dashboard

**Path params:** `id` (UUID)

**Response — 200:** `CustomerDetail`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer role accessing another customer's record |
| 404 | `not_found` | Customer ID does not exist |

---

### PATCH /customers/{id}

**Description:** Updates customer name, contact info, or WhatsApp group ID.
**Auth required:** Yes (admin only)
**Interaction:** 13 — Admin updates customer info

**Path params:** `id` (UUID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name":               { "type": "string" },
    "contact_info":       { "type": "string" },
    "whatsapp_group_id":  { "type": "string" }
  }
}
```

**Response — 200:** `CustomerDetail`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Customer ID does not exist |

---

### GET /customers/{id}/phones

**Description:** Returns all phones for a customer. Customers may only fetch their own; active and in_repair statuses only (replaced phones excluded unless `include_replaced=true`).
**Auth required:** Yes (admin, company, customer — own only)
**Interaction:** 14 — Views phones for a customer

**Path params:** `id` (UUID — customer ID)

**Query params**
```json
{
  "type": "object",
  "properties": {
    "include_replaced": { "type": "boolean", "default": false, "description": "When true, includes replaced phones (customer history view)" }
  }
}
```

**Response — 200**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "phones": { "type": "array", "items": { "$ref": "#/definitions/PhoneSummary" } }
  }
}
```

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer accessing another customer's phones |
| 404 | `not_found` | Customer ID does not exist |

---

### POST /customers/{id}/phones

**Description:** Creates a new phone for a customer.
**Auth required:** Yes (admin only)
**Interaction:** 15 — Admin creates a phone

**Path params:** `id` (UUID — customer ID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["model", "ownership"],
  "properties": {
    "model":     { "type": "string" },
    "ownership": { "type": "string", "enum": ["customer", "company"] }
  }
}
```

**Response — 201:** `PhoneSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Customer ID does not exist |

---

### PATCH /phones/{id}

**Description:** Updates a phone's model, ownership, or status. Status transitions are validated.
**Auth required:** Yes (admin only)
**Interaction:** 16 — Admin updates a phone

**Path params:** `id` (UUID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "model":     { "type": "string" },
    "ownership": { "type": "string", "enum": ["customer", "company"] },
    "status":    { "type": "string", "enum": ["active", "in_repair", "replaced"] }
  }
}
```

**Response — 200:** `PhoneSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Phone ID does not exist |

---

### GET /customers/{id}/sim-cards

**Description:** Returns all SIM cards for a customer. Customer role excludes cancelled SIMs unless `include_cancelled=true`.
**Auth required:** Yes (admin, company, customer — own only)
**Interaction:** 17 — Views SIM cards for a customer

**Path params:** `id` (UUID — customer ID)

**Query params**
```json
{
  "type": "object",
  "properties": {
    "include_cancelled": { "type": "boolean", "default": false, "description": "When true, includes cancelled SIMs (customer history view)" }
  }
}
```

**Response — 200**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "sim_cards": { "type": "array", "items": { "$ref": "#/definitions/SimCardSummary" } }
  }
}
```

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer accessing another customer's SIM cards |
| 404 | `not_found` | Customer ID does not exist |

---

### POST /customers/{id}/sim-cards

**Description:** Creates a new SIM card for a customer.
**Auth required:** Yes (admin only)
**Interaction:** 18 — Admin creates a SIM card

**Path params:** `id` (UUID — customer ID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "provider", "number", "base_monthly_fee"],
  "properties": {
    "type":             { "type": "string", "enum": ["prepaid", "postpaid"] },
    "provider":         { "type": "string", "enum": ["FREE", "ORANGE", "BOUYGUES", "SFR", "CORIOLIS"] },
    "number":           { "type": "string", "description": "FR mobile MSISDN. Accepted formats: 0[67]\\d{8} or +33[67]\\d{8}." },
    "base_monthly_fee": { "type": "number", "minimum": 0, "description": "Set to 0 for prepaid SIMs — fee field hidden in UI." },
    "phone_id":         { "type": "string", "format": "uuid", "description": "Optional — assigns SIM to a phone at creation" }
  }
}
```

**Response — 201:** `SimCardSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Customer ID or phone_id does not exist |
| 422 | `phone_belongs_to_different_customer` | phone_id references a phone not owned by this customer |
| 422 | `phone_already_has_sim` | The specified phone already has a SIM card assigned |

---

### PATCH /sim-cards/{id}

**Description:** Updates a SIM card's assigned phone, base monthly fee, status, provider, or number.
**Auth required:** Yes (admin only)
**Interaction:** 19 — Admin updates a SIM card

**Path params:** `id` (UUID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "phone_id":         { "type": ["string", "null"], "format": "uuid", "description": "null to unassign" },
    "base_monthly_fee": { "type": "number", "minimum": 0 },
    "status":           { "type": "string", "enum": ["active", "unassigned", "cancelled"] },
    "provider":         { "type": "string", "enum": ["FREE", "ORANGE", "BOUYGUES", "SFR", "CORIOLIS"] },
    "number":           { "type": "string", "description": "FR mobile MSISDN. Accepted formats: 0[67]\\d{8} or +33[67]\\d{8}." }
  }
}
```

**Response — 200:** `SimCardSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | SIM card ID does not exist |
| 422 | `phone_belongs_to_different_customer` | phone_id references a phone not owned by this SIM's customer |
| 422 | `phone_already_has_sim` | Target phone already has a different SIM assigned |

---

### PUT /sim-cards/{id}/monthly-billing

**Description:** Sets the actual operator bill amount for a postpaid SIM card for a specific billing period. Creates or replaces the record for that period.
**Auth required:** Yes (admin only)
**Interaction:** 20 — Admin enters actual postpaid SIM amount at month-end

**Path params:** `id` (UUID — SIM card ID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["period_month", "period_year", "actual_amount"],
  "properties": {
    "period_month":  { "type": "integer", "minimum": 1, "maximum": 12 },
    "period_year":   { "type": "integer" },
    "actual_amount": { "type": "number", "minimum": 0 }
  }
}
```

**Response — 200**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "sim_card_id":    { "type": "string", "format": "uuid" },
    "period_month":   { "type": "integer" },
    "period_year":    { "type": "integer" },
    "actual_amount":  { "type": "number" }
  }
}
```

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | SIM card ID does not exist |
| 422 | `sim_card_not_postpaid` | SIM card type is prepaid — actual amount only applies to postpaid |

---

### GET /customers/{id}/cost-breakdown

**Description:** Returns the monthly cost breakdown for a customer. Customer role may only fetch their own; admin and company may fetch any.
**Auth required:** Yes (admin, company, customer — own only)
**Interaction:** 21, 22 — Views monthly cost breakdown

**Path params:** `id` (UUID — customer ID)

**Query params**
```json
{
  "type": "object",
  "required": ["month", "year"],
  "properties": {
    "month": { "type": "integer", "minimum": 1, "maximum": 12 },
    "year":  { "type": "integer" }
  }
}
```

**Response — 200:** `CostBreakdown`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer accessing another customer's breakdown |
| 404 | `not_found` | Customer ID does not exist |

---

### GET /requests

**Description:** Returns a paginated, filterable list of requests. Customer role is automatically scoped to their own customer_id. Admin and company see all.
**Auth required:** Yes (all roles)
**Interaction:** 23, 24 — Views request list

**Query params**
```json
{
  "type": "object",
  "properties": {
    "page":        { "type": "integer", "default": 0 },
    "size":        { "type": "integer", "default": 20, "maximum": 100 },
    "status":      { "type": "string", "enum": ["submitted", "in_progress", "done"] },
    "type":        { "type": "string", "enum": ["phone_repair", "phone_replacement", "sim_topup", "new_sim", "manual_support", "onboarding"] },
    "customer_id": { "type": "string", "format": "uuid", "description": "Admin/company only — ignored for customer role" },
    "author":      { "type": "string", "enum": ["customer", "company"] }
  }
}
```

**Response — 200:** `PagedResponse` with `content: RequestSummary[]`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |

---

### POST /requests

**Description:** Submits a new request. Company may submit all types including onboarding; customer may submit all except onboarding.
**Auth required:** Yes (company, customer)
**Interaction:** 25 — Customer/company submits a new request

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "customer_id"],
  "properties": {
    "type":        { "type": "string", "enum": ["phone_repair", "phone_replacement", "sim_topup", "new_sim", "manual_support", "onboarding"] },
    "customer_id": { "type": "string", "format": "uuid" },
    "phone_id":    { "type": "string", "format": "uuid", "description": "Required for phone_repair, phone_replacement" },
    "sim_card_id": { "type": "string", "format": "uuid", "description": "Required for sim_topup" },
    "notes":       { "type": "string", "description": "Free-text description — required for onboarding (lists phones/SIMs to provision)" }
  }
}
```

**Response — 201:** `RequestSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer attempting to submit onboarding type |
| 403 | `forbidden` | Customer submitting a request for a different customer |
| 422 | `phone_id_required` | type requires phone_id but it was not provided |
| 422 | `sim_card_id_required` | type requires sim_card_id but it was not provided |
| 422 | `asset_belongs_to_different_customer` | phone_id or sim_card_id does not belong to the target customer |

---

### GET /requests/{id}

**Description:** Returns full request detail. Customer role may only view requests belonging to their customer_id. `time_spent_minutes` is omitted from company and customer responses.
**Auth required:** Yes (all roles — customer scoped)
**Interaction:** 26 — Views a request detail

**Path params:** `id` (UUID)

**Response — 200:** `RequestDetail`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer accessing another customer's request |
| 404 | `not_found` | Request ID does not exist |

---

### PATCH /requests/{id}

**Description:** Updates request status, fee, or notes. Status transitions are validated. When status transitions to `done`, `done_at` is set to the current timestamp.
**Auth required:** Yes (admin only)
**Interaction:** 27 — Admin updates a request

**Path params:** `id` (UUID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["submitted", "in_progress", "done"] },
    "fee":    { "type": ["number", "null"], "minimum": 0 },
    "notes":  { "type": "string" }
  }
}
```

**Response — 200:** `RequestDetail`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Request ID does not exist |
| 422 | `invalid_status_transition` | Requested status transition is not allowed (e.g. done → submitted) |

---

### POST /requests/{id}/parts

**Description:** Adds a part to a request.
**Auth required:** Yes (admin only)
**Interaction:** 28 — Admin adds a part to a request

**Path params:** `id` (UUID — request ID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["description", "cost"],
  "properties": {
    "description": { "type": "string" },
    "cost":        { "type": "number", "minimum": 0 }
  }
}
```

**Response — 201:** `RequestPart`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Request ID does not exist |

---

### DELETE /requests/{id}/parts/{partId}

**Description:** Removes a part from a request.
**Auth required:** Yes (admin only)
**Interaction:** 28 — Admin removes a part from a request

**Path params:** `id` (UUID — request ID), `partId` (UUID)

**Response — 204:** No content.

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Request or part ID does not exist |

---

### POST /requests/{id}/attachments

**Description:** Uploads a photo attachment to a request. Accepts multipart/form-data.
**Auth required:** Yes (all roles — customer scoped to own requests)
**Interaction:** 29 — Uploads an attachment

**Path params:** `id` (UUID — request ID)

**Request body:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | Yes | Image file. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`. Max 10 MB. |

**Response — 201:** `AttachmentSummary`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer uploading to another customer's request |
| 404 | `not_found` | Request ID does not exist |
| 422 | `unsupported_file_type` | File is not an accepted image MIME type |
| 413 | `file_too_large` | File exceeds 10 MB |

---

### GET /requests/{id}/attachments/{attachmentId}

**Description:** Streams the attachment file. Response Content-Type matches the original file MIME type. Customers may only access attachments on their own requests.
**Auth required:** Yes (all roles — customer scoped)
**Interaction:** 30 — Downloads an attachment

**Path params:** `id` (UUID — request ID), `attachmentId` (UUID)

**Response — 200:** Binary file stream. `Content-Type: image/jpeg` (or appropriate MIME type). `Content-Disposition: inline`.

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Customer accessing attachment on another customer's request |
| 404 | `not_found` | Request or attachment ID does not exist |

---

### GET /invoices

**Description:** Returns a paginated list of invoices. Ordered by period descending.
**Auth required:** Yes (admin, company)
**Interaction:** 31 — Admin/company views invoice list

**Query params**
```json
{
  "type": "object",
  "properties": {
    "page":   { "type": "integer", "default": 0 },
    "size":   { "type": "integer", "default": 20, "maximum": 100 },
    "status": { "type": "string", "enum": ["draft", "sent", "paid"] }
  }
}
```

**Response — 200:** `PagedResponse` with `content: InvoiceSummary[]`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is customer role |

---

### GET /invoices/current

**Description:** Returns the draft invoice for the current calendar month. Creates a new draft with computed fields if one does not exist yet.
**Auth required:** Yes (admin only)
**Interaction:** 32 — Admin views or creates current month invoice draft

**Response — 200:** `InvoiceDetail`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |

---

### PATCH /invoices/{id}

**Description:** Updates editable invoice fields. Only permitted on invoices with status `draft`. Company role may only update `rolling_advance_current`.
**Auth required:** Yes (admin, company — field-scoped)
**Interaction:** 33, 37 — Admin updates invoice fields; company updates rolling advance

**Path params:** `id` (UUID)

**Request body**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "support_fees":            { "type": "number", "minimum": 0, "description": "Admin only" },
    "rolling_advance_current": { "type": "number", "minimum": 0, "description": "Admin and company" }
  }
}
```

**Response — 200:** `InvoiceDetail`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Company attempting to update admin-only fields |
| 403 | `forbidden` | Customer accessing this endpoint |
| 404 | `not_found` | Invoice ID does not exist |
| 422 | `invoice_not_editable` | Invoice status is not draft |

---

### POST /invoices/{id}/send

**Description:** Transitions invoice from `draft` to `sent`, generates the PDF, and dispatches a WhatsApp notification to the company.
**Auth required:** Yes (admin only)
**Interaction:** 34 — Admin sends the invoice

**Path params:** `id` (UUID)

**Request body:** None

**Response — 200:** `InvoiceDetail` (status is now `sent`)

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Invoice ID does not exist |
| 422 | `invoice_not_draft` | Invoice is not in draft status |

---

### POST /invoices/{id}/mark-paid

**Description:** Transitions invoice from `sent` to `paid`.
**Auth required:** Yes (admin only)
**Interaction:** 35 — Admin marks invoice as paid

**Path params:** `id` (UUID)

**Request body:** None

**Response — 200:** `InvoiceDetail` (status is now `paid`)

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |
| 404 | `not_found` | Invoice ID does not exist |
| 422 | `invoice_not_sent` | Invoice is not in sent status |

---

### GET /invoices/{id}/pdf

**Description:** Streams the generated invoice PDF. Only available for invoices with status `sent` or `paid`.
**Auth required:** Yes (admin, company)
**Interaction:** 36 — Downloads invoice PDF

**Path params:** `id` (UUID)

**Response — 200:** Binary PDF stream. `Content-Type: application/pdf`. `Content-Disposition: attachment; filename="invoice-{invoice_number}.pdf"`.

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is customer role |
| 404 | `not_found` | Invoice ID does not exist |
| 422 | `pdf_not_available` | Invoice is still in draft status — PDF is generated on send |

---

### GET /settings

**Description:** Returns the current system settings (bank details used on invoice PDFs).
**Auth required:** Yes (admin only)
**Interaction:** 38 — Admin views system settings

**Response — 200:** `SystemSettings`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |

---

### PUT /settings

**Description:** Replaces the system settings record.
**Auth required:** Yes (admin only)
**Interaction:** 39 — Admin updates system settings

**Request body:** `SystemSettings` (all fields required)

**Response — 200:** `SystemSettings`

**Error responses**

| Status | Error code | Condition |
|--------|-----------|-----------|
| 401 | `unauthenticated` | No valid token |
| 403 | `forbidden` | Caller is not admin |

---

## Events (real-time)

N/A — No server-to-client real-time channel. WhatsApp notifications are dispatched server-to-WhatsApp on backend events and do not require a client-side real-time connection. The frontend refreshes data by re-fetching endpoints after user actions.
