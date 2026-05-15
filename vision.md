# Tetra Billing Dashboard — Product Specification

## 1. Overview

A web dashboard to manage local mobile phone support operations on behalf of **Tetra Mobile Solutions FZ-LLC**. The system centralizes phone and SIM card tracking, customer request management, operations logging, and monthly invoice generation. Three distinct roles access the system with different levels of visibility and action.

---

## 2. Roles & Access

| Role | Description |
|------|-------------|
| **Admin** | Single superuser (Oscar). Full access to everything. The only role that sees time tracking and base salary configuration. |
| **Company** | Tetra Mobile Solutions. Single login for MVP. Views all customers, phones, requests. Can submit requests on behalf of customers. Manages rolling advances. Receives the monthly invoice. |
| **Customer** | One account per customer, but multiple people (users) can log in under the same customer account. Views own phones, SIM cards, requests, and monthly cost breakdown. Cannot see base salary or other customers. |

---

## 3. Core Data Models

### 3.1 Customer

- Name, contact info
- List of assigned phones
- List of assigned SIM cards
- Monthly cost breakdown (dashboard only)

### 3.2 Phone

| Field | Notes |
|-------|-------|
| Model | Free text |
| Ownership | `customer` or `company` |
| Assigned customer | Required — once assigned, fees always attributed to that customer regardless of ownership |
| Status | `active`, `in_repair`, `replaced` |

One customer can have multiple phones. A `replaced` phone is retained in full history but removed from the customer's active dashboard view. The replacement phone is added as a new entry when the replacement request is marked done.

A phone with no SIM card assigned is flagged as **unused** on the dashboard as a visual indicator.

### 3.3 SIM Card

| Field | Notes |
|-------|-------|
| Type | `prepaid` or `postpaid` |
| Base monthly fee | Fixed amount set at creation |
| Actual monthly amount | Postpaid only — entered by admin at end of month to reflect real operator bill |
| Assigned customer | Required |
| Assigned phone | Optional — SIM can be linked to a specific phone belonging to the same customer |
| Status | `active`, `unassigned`, `cancelled` |

One customer can have multiple SIM cards. When a phone is replaced, the SIM card becomes `unassigned` until manually re-assigned to another phone. An `unassigned` SIM still accumulates its monthly fee. A `cancelled` SIM is no longer billed.

An `unassigned` SIM (no phone linked) is flagged as **unused** on the dashboard as a visual indicator.

**Postpaid billing logic:** The system displays the base monthly fee during the month. At month-end, admin enters the actual operator bill amount which replaces the base fee for that month's invoice.

### 3.4 Request

| Field | Notes |
|-------|-------|
| Type | See Section 5 |
| Status | `submitted` → `in_progress` → `done` |
| Target customer | Always set — even company requests are attributed to a specific customer |
| Target phone / SIM | Required for all types except New SIM Card (customer only) and Onboarding (no asset yet) |
| Author | `customer` or `company` — tracked but does not affect billing |
| Fee | Set by admin at creation or on update |
| Parts used | List of parts with costs |
| Time spent | Admin-only — not visible to company or customer |
| Attachments | Photo uploads — can be added by admin, company, or customer. Visible to admin and company. Customers only see attachments on their own requests. |
| Created at | Timestamp |

### 3.5 Invoice

| Field | Notes |
|-------|-------|
| Invoice number | Sequential, auto-incremented |
| Period | Month + Year |
| Support Fees | Base salary (manually set by admin each month) |
| Support Expenses | Aggregated total of all customer fees for the month |
| Rolling Advance (current) | Positive — entered by admin or company |
| Rolling Advance deduction (previous) | Negative — auto-carried from previous month's advance |
| Previous Balance | Unpaid carry-over from last invoice |
| Taxes | €0 (for now) |
| Total | Computed |
| Status | `draft` → `sent` → `paid` |
| Currency | EUR |

Invoices are issued to the company. Only admin and company can see them.

### 3.6 Customer Cost Breakdown

Not an invoice — a monthly view available on the dashboard for admin, company (per customer), and each customer (their own only).

Contents:
- SIM card monthly fees (one line per SIM)
- Request fees (one line per billable request)
- Total for the month

Base salary, rolling advance, and previous balance are **not shown** in the customer breakdown.

---

## 4. Request Types

### Billable Requests

| Type | Target reference | Fee Logic | On completion |
|------|-----------------|-----------|---------------|
| Phone Repair | Existing phone | Fee set by admin (parts + labor) | Phone status returns to `active` |
| Phone Replacement | Old phone being replaced | Cost of the replacement phone | Old phone → `replaced`; new phone entry created as `active` (no SIM initially, flagged unused) |
| SIM Card Top-up | Existing SIM | Top-up amount (prepaid only) | No asset change |
| New SIM Card | Customer only — no phone/SIM yet | Cost of the new SIM card | New SIM created as `unassigned` (flagged unused); admin assigns to a phone manually |

### Non-billable Requests

| Type | Target reference | Fee Logic |
|------|-----------------|-----------|
| Manual Support | Existing phone or SIM | Free — included in base salary (covers: reboot, phone setup, general assistance, etc.) |

### Company Onboarding Request

A separate request category submitted only by the company. Does not require an existing phone or SIM reference. Contains:
- New customer name and contact info
- List of phones to provision (model, ownership)
- List of SIM cards to provision (type, base monthly fee)

Status flow: `submitted` → `in_progress` → `done`

On completion, the admin creates the customer account, provisions the phones and SIM cards, and the customer gains dashboard access. The new customer, phones, and SIMs appear in the system only when the request is marked done.

### Request Authorship

- Customers submit requests for themselves (billable and manual support types only — not onboarding).
- The company can submit any request type including onboarding.
- When the company submits a billable or support request on behalf of a customer, it appears on the customer's cost breakdown exactly as if the customer had submitted it. Only the `author` field differs.
- Customers can see all requests on their account regardless of who submitted them, including requests submitted by the company on their behalf.

---

## 5. Operations Tracking

Tracked per request:

| Field | Visible to |
|-------|-----------|
| Time spent | Admin only |
| Parts used (list + costs) | Admin, Company |
| Total fee | Admin, Company, Customer |

---

## 6. Billing & Invoice Generation

### Monthly Flow

1. During the month, fees accumulate per customer (SIM fees + request fees).
2. At month-end, admin:
   - Enters actual postpaid SIM amounts if they differ from the base fee.
   - Sets the base salary for the month.
   - Reviews rolling advance and previous balance.
3. Admin generates the invoice (draft → review → send).
4. Invoice PDF is generated in the standard format (see Section 6.1).
5. Invoice status is manually moved to `paid` by admin once payment is received.

The company can increase or decrease the rolling advance at any time. The system records the current month's advance and automatically deducts the previous month's advance on the next invoice.

### 6.1 Invoice PDF Structure

```
ISSUED TO:                          INVOICE NO: [N]
[Company Name]                      DATE: [DD.MM.YYYY]
[Company Address]

PAY TO:
[Admin Bank Details]

[Month Year] Local Support and Expenses

DESCRIPTION                         PRICE       TOTAL
[Month] Local Support Fees          €X          €X
[Month] Local Support Expenses      €X          €X
Rolling Advance for [Month]         €X          €X
Rolling Advance for [Prev Month]    -€X         -€X
Previous Balance                    €X          €X

SUBTOTAL                                        €X
TAXES                                           €0
TOTAL                                           €X
```

The "Support Expenses" line is always a single aggregated number on the invoice. The per-customer and per-request breakdown is available on the dashboard only.

---

## 7. Dashboard Views

### Admin Dashboard

- **Overview**: total active customers, total phones, total SIM cards, open requests count
- **Customer list**: name, phone count, SIM count, open requests, current month cost
- **Customer detail**: phones, SIM cards, requests (all), cost breakdown (full detail), time tracking
- **Requests**: full list with filters (status, type, customer, author)
- **Billing**: current month invoice draft, invoice history (all statuses), advance management
- **Operations**: time spent summary across all requests (admin only)
- **Settings**: configurable bank details (account holder name, IBAN, SWIFT code) used on generated invoice PDFs

### Company Dashboard

- **Overview**: total customers, phones, SIM cards, open requests
- **Customer list**: same as admin minus time tracking
- **Customer detail**: phones, SIM cards, requests, cost breakdown (no time tracking)
- **Requests**: submit a new request for any customer
- **Billing**: current month invoice (view only), invoice history, manage rolling advance

### Customer Dashboard

- **My Phones**: active phones only (status `active` or `in_repair`). Clicking a phone opens a detail view with the option to submit a request pre-linked to that phone.
- **My SIM Cards**: active and unassigned SIM cards. Clicking a SIM card opens a detail view with the option to submit a request pre-linked to that SIM.
- **My Requests**: full history — all statuses, all authors (including requests submitted by the company on their behalf). Requests are linked to a phone or SIM and pre-filled when initiated from the device view.
- **My Monthly Costs**: current month breakdown (SIM fees + request fees + total), previous months history
- **History**: replaced phones and cancelled SIM cards — read-only, not shown in the main active view

---

## 8. Notifications (WhatsApp — Automated)

Each customer has a dedicated WhatsApp group containing:
- All users belonging to that customer account
- The admin (Oscar)

The system sends automated messages to the group via the **WhatsApp Business API (Meta)** on the following events:

| Event | Recipient |
|-------|-----------|
| New request submitted (by customer or company) | Customer WhatsApp group |
| Request status changes (submitted → in progress → done) | Customer WhatsApp group |
| Monthly cost summary at end of month | Customer WhatsApp group |
| Invoice generated (sent status) | Company notification |

Message content will use approved WhatsApp message templates.

> **Future scope**: push notification support on mobile to be designed separately.

---

## 9. Onboarding Flow (New Client)

The company submits a "new client onboarding" request. This may include:
- Purchasing new phones
- Purchasing new SIM cards (prepaid or postpaid)

The admin receives the request, works on it (Submitted → In Progress → Done), creates the customer account, assigns phones and SIM cards, and the customer receives access to the dashboard.

---

## 10. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js |
| Backend | Java (Spring Boot) |
| Notifications | WhatsApp Business API (Meta) |
| PDF Generation | TBD at planning phase |
| Database | TBD at planning phase |

---

## 11. Out of Scope (Future)

- Push notifications (mobile app)
- Automated postpaid SIM bill fetching (no operator API available — currently manual entry)
- Multi-company support
- Tax configuration (currently always €0)
- Payment gateway integration (invoice paid status is manually set by admin)
