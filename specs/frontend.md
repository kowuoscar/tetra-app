# Frontend spec

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query v5 · Zustand

---

## Pages / screens

---

### Login

- **Route:** `/login`
- **Roles:** All (unauthenticated)
- **Purpose:** Authenticate user and receive JWT session cookies.
- **Auth required:** No (redirects authenticated users to `/overview` or `/phones`)
- **Key states:** idle | submitting | error
- **Contracts:**
  - `POST /auth/login` — submit credentials, receive session tokens
- **Components:** `LoginForm`

---

### Overview

- **Route:** `/overview`
- **Roles:** admin, company
- **Purpose:** View aggregate stats across all customers, phones, SIMs, and open requests.
- **Auth required:** Yes
- **Key states:** loading | populated
- **Contracts:**
  - `GET /dashboard/stats` — fetch overview numbers
- **Components:** `AppShell`, `PageHeader`, `StatsGrid`, `StatCard`

---

### Customer List

- **Route:** `/customers`
- **Roles:** admin, company
- **Purpose:** Browse and search all customers; navigate to customer detail.
- **Auth required:** Yes
- **Key states:** loading | empty | populated
- **Contracts:**
  - `GET /customers` — paginated, filterable customer list
  - `POST /customers` — admin creates customer (modal triggered from this page)
- **Components:** `AppShell`, `PageHeader`, `SearchInput`, `CustomerTable`, `CustomerRow`, `CreateCustomerModal`, `Pagination`

---

### Customer Detail

- **Route:** `/customers/[id]`
- **Roles:** admin, company, customer (own `customer_id` only)
- **Purpose:** View full customer profile across five tabs: Phones, SIM Cards, Requests, Cost Breakdown, Time Tracking (admin only).
- **Auth required:** Yes
- **Key states:** loading | populated | forbidden (customer accessing another customer's record)
- **Contracts:**
  - `GET /customers/{id}` — customer header data
  - `PATCH /customers/{id}` — admin edit (modal triggered from header)
  - `GET /customers/{id}/phones` — phones tab
  - `GET /customers/{id}/sim-cards` — SIM cards tab
  - `GET /requests?customer_id={id}` — requests tab
  - `GET /customers/{id}/cost-breakdown` — cost breakdown tab
  - `POST /customers/{id}/phones` — admin creates phone (modal on phones tab)
  - `POST /customers/{id}/sim-cards` — admin creates SIM (modal on SIM tab)
- **Components:** `AppShell`, `CustomerDetailHeader`, `CustomerTabNav`, `CustomerPhonesTab`, `CustomerSimCardsTab`, `CustomerRequestsTab`, `CustomerCostBreakdownTab`, `CustomerTimeTrackingTab`, `EditCustomerModal`, `CreatePhoneModal`, `CreateSimCardModal`

---

### Request List

- **Route:** `/requests`
- **Roles:** all (customer role auto-scoped to own)
- **Purpose:** Browse all requests with filters; admin and company see all, customer sees own only.
- **Auth required:** Yes
- **Key states:** loading | empty | populated
- **Contracts:**
  - `GET /requests` — filterable, paginated list
- **Components:** `AppShell`, `PageHeader`, `RequestFilters`, `RequestTable`, `RequestRow`, `StatusBadge`, `Pagination`

---

### New Request

- **Route:** `/requests/new`
- **Roles:** company, customer
- **Purpose:** Submit a new service request.
- **Auth required:** Yes
- **Key states:** idle | submitting | success | error
- **Contracts:**
  - `POST /requests` — submit new request
  - `GET /customers` — customer selector (company only; customer role uses own customer_id)
  - `GET /customers/{id}/phones` — phone selector (populated when customer is selected)
  - `GET /customers/{id}/sim-cards` — SIM selector (populated when customer is selected)
- **Components:** `AppShell`, `PageHeader`, `NewRequestForm`

---

### Request Detail

- **Route:** `/requests/[id]`
- **Roles:** all (customer scoped to own)
- **Purpose:** View a request in full; admin updates status, fee, parts; all roles upload attachments.
- **Auth required:** Yes
- **Key states:** loading | populated | forbidden
- **Contracts:**
  - `GET /requests/{id}` — request detail
  - `PATCH /requests/{id}` — admin updates status, fee, notes
  - `POST /requests/{id}/parts` — admin adds part
  - `DELETE /requests/{id}/parts/{partId}` — admin removes part
  - `POST /requests/{id}/attachments` — upload attachment
  - `GET /requests/{id}/attachments/{attachmentId}` — view attachment
- **Components:** `AppShell`, `RequestDetailHeader`, `RequestStatusStepper`, `RequestPartsEditor`, `RequestFeeInput`, `AttachmentGrid`, `AttachmentUploader`

---

### Invoice List

- **Route:** `/billing`
- **Roles:** admin, company
- **Purpose:** Browse invoice history; admin navigates to current draft or past invoices.
- **Auth required:** Yes
- **Key states:** loading | empty | populated
- **Contracts:**
  - `GET /invoices` — paginated invoice list
  - `GET /invoices/current` — admin fetch/create current month draft (triggered from header CTA)
- **Components:** `AppShell`, `PageHeader`, `InvoiceTable`, `InvoiceRow`, `StatusBadge`, `Pagination`

---

### Invoice Detail

- **Route:** `/billing/[id]`
- **Roles:** admin, company
- **Purpose:** View a single invoice; admin edits fields and sends; company views and updates rolling advance; both download PDF.
- **Auth required:** Yes
- **Key states:** loading | populated (draft/sent/paid — different action availability per status)
- **Contracts:**
  - `GET /invoices/{id}` — invoice data (via cache from list)
  - `PATCH /invoices/{id}` — update fields
  - `POST /invoices/{id}/send` — send invoice
  - `POST /invoices/{id}/mark-paid` — mark as paid
  - `GET /invoices/{id}/pdf` — download PDF (browser download trigger)
- **Components:** `AppShell`, `InvoiceDetailHeader`, `InvoiceLineItems`, `InvoiceFieldsEditor`, `InvoiceActions`, `ConfirmDialog`

---

### Settings

- **Route:** `/settings`
- **Roles:** admin only
- **Purpose:** Configure bank details printed on invoice PDFs.
- **Auth required:** Yes
- **Key states:** loading | populated | saving
- **Contracts:**
  - `GET /settings` — fetch current settings
  - `PUT /settings` — save settings
- **Components:** `AppShell`, `PageHeader`, `SystemSettingsForm`

---

### User Management

- **Route:** `/users`
- **Roles:** admin only
- **Purpose:** List, create, edit, and deactivate user accounts across all roles.
- **Auth required:** Yes
- **Key states:** loading | empty | populated
- **Contracts:**
  - `GET /users` — paginated user list
  - `POST /users` — create user
  - `PATCH /users/{id}` — update user
  - `DELETE /users/{id}` — deactivate user
- **Components:** `AppShell`, `PageHeader`, `UserTable`, `UserRow`, `CreateUserModal`, `EditUserModal`, `ConfirmDialog`

---

### My Phones

- **Route:** `/phones`
- **Roles:** customer only
- **Purpose:** View own active phones; click a phone to pre-fill a new request.
- **Auth required:** Yes
- **Key states:** loading | empty | populated
- **Contracts:**
  - `GET /customers/{id}/phones` — own phones (id from auth token)
- **Components:** `AppShell`, `PageHeader`, `MyPhonesList`, `MyPhoneCard`

---

### My SIM Cards

- **Route:** `/sim-cards`
- **Roles:** customer only
- **Purpose:** View own active and unassigned SIM cards; click a SIM to pre-fill a new request.
- **Auth required:** Yes
- **Key states:** loading | empty | populated
- **Contracts:**
  - `GET /customers/{id}/sim-cards` — own SIMs
- **Components:** `AppShell`, `PageHeader`, `MySimCardsList`, `MySimCardCard`

---

### My Monthly Costs

- **Route:** `/costs`
- **Roles:** customer only
- **Purpose:** View current month and historical cost breakdowns (SIM fees + request fees).
- **Auth required:** Yes
- **Key states:** loading | populated
- **Contracts:**
  - `GET /customers/{id}/cost-breakdown?month=&year=` — cost breakdown for selected period
- **Components:** `AppShell`, `PageHeader`, `MonthPicker`, `CostBreakdownView`

---

### My History

- **Route:** `/history`
- **Roles:** customer only
- **Purpose:** View replaced phones and cancelled SIM cards (read-only archive).
- **Auth required:** Yes
- **Key states:** loading | empty | populated
- **Contracts:**
  - `GET /customers/{id}/phones?include_replaced=true` — includes replaced phones
  - `GET /customers/{id}/sim-cards?include_cancelled=true` — includes cancelled SIMs
- **Components:** `AppShell`, `PageHeader`, `MyHistoryView`

---

## Component inventory

---

### AppShell

**Description:** Authenticated page shell — sidebar nav + top bar + content area.
**Pages:** All authenticated pages

**Props:**
```typescript
interface AppShellProps {
  children: React.ReactNode
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| default | Sidebar open, content rendered | `--color-surface` sidebar, `--color-background-secondary` content |
| sidebar-collapsed | Sidebar icon-only mode | Sidebar shrinks to 56px; nav item labels hidden |

**Token references:**
- Sidebar bg: `--color-surface`
- Sidebar border: `--color-border`
- Content bg: `--color-background-secondary`
- Shadow: `--shadow-sm` on top bar

**Contract:** None (layout only)

---

### Sidebar

**Description:** Role-aware left navigation. Renders only routes accessible to the authenticated user's role.
**Pages:** All authenticated pages (inside `AppShell`)

**Props:**
```typescript
interface SidebarProps {
  role: 'admin' | 'company' | 'customer'
  currentPath: string
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| default | Full labels visible | 220px wide |
| collapsed | Icon-only | 56px wide; labels in tooltips |
| active-item | Current route highlighted | `--color-brand-secondary` bg, `--color-brand-primary` text, `--font-weight-medium` |

**Token references:**
- Active bg: `--color-brand-secondary`
- Active text: `--color-brand-primary`
- Default text: `--color-text-secondary`
- Hover bg: `--color-background-tertiary`
- Radius: `--radius-md`

**Contract:** None (nav state from router)

---

### TopBar

**Description:** Fixed top bar with breadcrumb navigation, role badge, and user avatar menu.
**Pages:** All authenticated pages

**Props:**
```typescript
interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[]
  user: { name: string; role: 'admin' | 'company' | 'customer' }
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| default | Breadcrumb + avatar | `--color-surface` bg, `--shadow-sm` |

**Token references:**
- Bg: `--color-surface`
- Border: `--color-border`
- Shadow: `--shadow-sm`
- Breadcrumb text: `--color-text-secondary`
- Current page: `--color-text-primary`, `--font-weight-medium`

**Contract:** None (data from Zustand auth store)

---

### LoginForm

**Description:** Email + password form that submits credentials and handles error states.
**Pages:** Login

**Props:**
```typescript
interface LoginFormProps {}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| idle | Empty form | Default input styles |
| submitting | Request in flight | Submit button shows spinner, inputs disabled |
| error | `invalid_credentials` or `account_deactivated` | Error toast, form remains editable |

**Token references:**
- Input border focus: `--color-brand-primary` + `0 0 0 3px rgb(79 70 229 / 0.15)` focus ring
- Error text: `--color-status-error`
- Submit button: `--color-brand-primary`

**Contract:** `POST /auth/login`

---

### StatsGrid

**Description:** Grid of four `StatCard` components showing overview metrics.
**Pages:** Overview

**Props:**
```typescript
interface StatsGridProps {
  stats: { label: string; value: number; icon: React.ReactNode }[]
  isLoading?: boolean
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Data fetching | Four skeleton `StatCard` placeholders |
| populated | Stats rendered | `--space-4` grid gap, responsive 2×2 then 4×1 |

**Token references:**
- Grid gap: `--space-4`
- Responsive: `--breakpoint-lg` switches from 2-col to 4-col

**Contract:** `GET /dashboard/stats`

---

### StatCard

**Description:** Single metric card with icon, label, and value.
**Pages:** Overview

**Props:**
```typescript
interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  isLoading?: boolean
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Skeleton | `--color-background-tertiary` shimmer |
| populated | Value shown | `--font-size-3xl` bold value, `--color-text-secondary` label |

**Token references:**
- Card bg: `--color-surface`
- Border: `--color-border`
- Radius: `--radius-lg`
- Shadow: `--shadow-sm`
- Value: `--font-size-2xl`, `--font-weight-bold`
- Label: `--font-size-sm`, `--color-text-secondary`
- Padding: `--space-6`

**Contract:** `GET /dashboard/stats`

---

### CustomerTable

**Description:** Paginated table of customer rows with search.
**Pages:** Customer List

**Props:**
```typescript
interface CustomerTableProps {
  customers: CustomerSummary[]
  isLoading: boolean
  totalPages: number
  page: number
  onPageChange: (page: number) => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Skeleton rows | 5 skeleton rows at table height |
| empty | No customers | `EmptyState` with "No customers yet" |
| populated | Rows rendered | Alternating `--color-surface` / `--color-background-secondary` rows |

**Token references:**
- Table border: `--color-border`
- Header bg: `--color-background-secondary`
- Header text: `--font-size-xs`, `--font-weight-semibold`, `--color-text-secondary`
- Row hover: `--color-background-tertiary`
- Radius (container): `--radius-lg`

**Contract:** `GET /customers`

---

### CustomerRow

**Description:** Single row in `CustomerTable` with name, stats, current month cost, and open request count.
**Pages:** Customer List

**Props:**
```typescript
interface CustomerRowProps {
  customer: CustomerSummary
  onClick: () => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| default | Row data | `--font-size-sm` text |
| hover | Highlighted | `--color-background-tertiary` bg, cursor pointer |

**Token references:**
- Name: `--font-weight-medium`, `--color-text-primary`
- Cost: `--font-family-mono`, `--font-size-sm`
- Padding: `--space-4` vertical, `--space-5` horizontal

**Contract:** None (data from `CustomerTable`)

---

### CustomerDetailHeader

**Description:** Customer name, contact info, WhatsApp group ID, and action buttons (Edit — admin only).
**Pages:** Customer Detail

**Props:**
```typescript
interface CustomerDetailHeaderProps {
  customer: CustomerDetail
  canEdit: boolean
  onEdit: () => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Skeleton | Name, contact skeleton lines |
| populated | Data shown | — |

**Token references:**
- Name: `--font-size-2xl`, `--font-weight-bold`
- Contact: `--color-text-secondary`, `--font-size-sm`
- Padding: `--space-6`
- Border-bottom: `--color-border`

**Contract:** `GET /customers/{id}`

---

### CustomerTabNav

**Description:** Tab navigation for Customer Detail page. Renders Time Tracking tab only for admin role.
**Pages:** Customer Detail

**Props:**
```typescript
interface CustomerTabNavProps {
  activeTab: 'phones' | 'sim-cards' | 'requests' | 'cost-breakdown' | 'time-tracking'
  role: 'admin' | 'company' | 'customer'
  onTabChange: (tab: string) => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| active | Selected tab | `--color-brand-primary` underline, `--font-weight-medium` |
| inactive | Other tabs | `--color-text-secondary`, no underline |

**Token references:**
- Active indicator: `--color-brand-primary`, 2px underline
- Tab text inactive: `--color-text-secondary`
- Tab text active: `--color-text-primary`
- Border-bottom: `--color-border`

**Contract:** None (URL param driven)

---

### PhoneCard

**Description:** Phone asset card showing model, ownership, status badge, linked SIM summary, and unused flag.
**Pages:** Customer Detail (Phones tab), My Phones

**Props:**
```typescript
interface PhoneCardProps {
  phone: PhoneSummary
  canEdit: boolean
  onEdit?: () => void
  onRequestClick?: () => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| active | Normal phone | `--color-surface` bg |
| unused | No SIM assigned | `--color-status-warning-bg` subtle tint, warning badge |
| in-repair | Status in_repair | Warning status badge |
| replaced | Historical record | `--color-text-disabled` text, greyed appearance |

**Token references:**
- Card bg: `--color-surface`
- Border: `--color-border`
- Radius: `--radius-lg`
- Shadow: `--shadow-sm`
- Unused tint: `--color-status-warning-bg`
- Padding: `--space-5`

**Contract:** `GET /customers/{id}/phones`

---

### SimCardCard

**Description:** SIM card asset card showing type, base fee, status, linked phone, and unused flag.
**Pages:** Customer Detail (SIM Cards tab), My SIM Cards

**Props:**
```typescript
interface SimCardCardProps {
  simCard: SimCardSummary
  canEdit: boolean
  onEdit?: () => void
  onRequestClick?: () => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| active | SIM assigned to phone | Normal |
| unassigned | No phone linked | `--color-status-warning-bg` tint, warning badge |
| cancelled | Cancelled SIM | `--color-text-disabled`, greyed |

**Token references:** Same as `PhoneCard`

**Contract:** `GET /customers/{id}/sim-cards`

---

### StatusBadge

**Description:** Color-coded pill badge mapping entity statuses to semantic colors.
**Pages:** All pages with request, phone, SIM, or invoice data

**Props:**
```typescript
interface StatusBadgeProps {
  status: string
  entity: 'request' | 'phone' | 'sim' | 'invoice'
}
```

Status→color mapping:
- `submitted` → info · `in_progress` → warning · `done` → success
- `active` → success · `in_repair` → warning · `replaced` → neutral
- `unassigned` → warning · `cancelled` → neutral
- `draft` → neutral · `sent` → info · `paid` → success

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| success | Positive terminal status | `--color-status-success-bg`, `--color-status-success` |
| warning | In-progress or needs action | `--color-status-warning-bg`, `--color-status-warning` |
| error | Cancelled/destructive | `--color-status-error-bg`, `--color-status-error` |
| info | Submitted/sent | `--color-status-info-bg`, `--color-status-info` |
| neutral | Replaced/draft | `--color-background-tertiary`, `--color-text-secondary` |

**Token references:**
- Radius: `--radius-full`
- Font: `--font-size-xs`, `--font-weight-medium`
- Padding: `2px --space-2`

**Contract:** None (display only)

---

### RequestTable

**Description:** Filterable, paginated table of requests. Role-aware: customer role shows only own requests automatically.
**Pages:** Request List

**Props:**
```typescript
interface RequestTableProps {
  requests: RequestSummary[]
  isLoading: boolean
  totalPages: number
  page: number
  onPageChange: (page: number) => void
  role: 'admin' | 'company' | 'customer'
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Skeleton rows | 8 skeleton rows |
| empty | No requests match filters | `EmptyState` with "No requests found" |
| populated | Rows rendered | — |

**Token references:** Same as `CustomerTable`

**Contract:** `GET /requests`

---

### RequestFilters

**Description:** Filter bar for request list: status, type, customer (admin/company only), author.
**Pages:** Request List

**Props:**
```typescript
interface RequestFiltersProps {
  filters: { status?: string; type?: string; customer_id?: string; author?: string }
  role: 'admin' | 'company' | 'customer'
  onFilterChange: (filters: RequestFiltersProps['filters']) => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| default | No filters applied | All selects show placeholder |
| filtered | One+ active filters | Active filter chips below selects in `--color-brand-secondary` |

**Token references:**
- Filter chip bg: `--color-brand-secondary`
- Filter chip text: `--color-brand-primary`
- Chip radius: `--radius-full`

**Contract:** None (drives query params for `GET /requests`)

---

### RequestDetailHeader

**Description:** Request type, status stepper, customer name, target asset, author, and created/done timestamps.
**Pages:** Request Detail

**Props:**
```typescript
interface RequestDetailHeaderProps {
  request: RequestSummary
  role: 'admin' | 'company' | 'customer'
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Skeleton | Header skeleton |
| populated | Data shown | — |

**Token references:**
- Title: `--font-size-xl`, `--font-weight-semibold`
- Meta: `--font-size-sm`, `--color-text-secondary`

**Contract:** `GET /requests/{id}`

---

### RequestStatusStepper

**Description:** Visual three-step progress bar: Submitted → In Progress → Done.
**Pages:** Request Detail

**Props:**
```typescript
interface RequestStatusStepperProps {
  status: 'submitted' | 'in_progress' | 'done'
  canAdvance: boolean
  onAdvance: (newStatus: string) => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| submitted | Step 1 active | Step 1 in `--color-brand-primary`, rest `--color-border` |
| in_progress | Step 2 active | Steps 1–2 in `--color-brand-primary` |
| done | All steps complete | All steps `--color-status-success` |

**Token references:**
- Active step: `--color-brand-primary`
- Complete step: `--color-status-success`
- Inactive step: `--color-border`
- Connector line: same as step

**Contract:** `PATCH /requests/{id}` (via `onAdvance`)

---

### RequestPartsEditor

**Description:** Admin-only list of parts with costs; add/remove controls.
**Pages:** Request Detail

**Props:**
```typescript
interface RequestPartsEditorProps {
  requestId: string
  parts: RequestPart[]
  canEdit: boolean
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| empty | No parts added | "No parts added yet" placeholder text |
| populated | Parts list | Each part row: description + cost + delete button |
| adding | Add form visible | Inline description input + cost input |

**Token references:**
- Cost: `--font-family-mono`
- Delete btn: `--color-status-error` on hover
- Border: `--color-border`

**Contracts:** `POST /requests/{id}/parts`, `DELETE /requests/{id}/parts/{partId}`

---

### AttachmentGrid

**Description:** Grid of uploaded photo thumbnails. Clicking opens the attachment. Customers only see attachments on own requests.
**Pages:** Request Detail

**Props:**
```typescript
interface AttachmentGridProps {
  requestId: string
  attachments: AttachmentSummary[]
  isLoading: boolean
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Fetching | Skeleton grid items |
| empty | No attachments | "No attachments uploaded yet" |
| populated | Thumbnail grid | 3-col grid, `--radius-md` images, `--shadow-sm` |

**Token references:**
- Grid gap: `--space-2`
- Thumbnail radius: `--radius-md`
- Shadow: `--shadow-sm`

**Contract:** `GET /requests/{id}/attachments/{attachmentId}` (per thumbnail load)

---

### AttachmentUploader

**Description:** Drag-and-drop or click-to-upload file input. Accepts jpeg, png, webp up to 10 MB.
**Pages:** Request Detail

**Props:**
```typescript
interface AttachmentUploaderProps {
  requestId: string
  onSuccess: () => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| idle | Default dropzone | Dashed `--color-border` border, `--radius-lg` |
| drag-over | File dragged over | `--color-brand-secondary` bg, `--color-brand-primary` border |
| uploading | Upload in flight | Progress indicator, `--color-brand-primary` |
| error | Upload failed | `--color-status-error` border + error message |

**Token references:**
- Idle border: `--color-border` dashed
- Hover bg: `--color-brand-secondary`
- Active border: `--color-brand-primary`
- Error border: `--color-status-error`

**Contract:** `POST /requests/{id}/attachments`

---

### NewRequestForm

**Description:** Multi-field form for submitting a new request. Company role includes a customer selector. Type field drives which subsequent fields are shown.
**Pages:** New Request

**Props:**
```typescript
interface NewRequestFormProps {
  role: 'company' | 'customer'
  prefillPhoneId?: string
  prefillSimCardId?: string
  prefillCustomerId?: string
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| idle | Empty form | All fields at default |
| customer-selected | Company has selected customer | Phone/SIM selectors populated from API |
| submitting | Submission in flight | Button shows spinner, inputs disabled |
| error | Submission failed | Error toast |

**Token references:**
- Form gap: `--space-4`
- Label: `--font-size-sm`, `--font-weight-medium`
- Input focus ring: 3px `--color-brand-primary` at 15% opacity

**Contracts:** `POST /requests`, `GET /customers`, `GET /customers/{id}/phones`, `GET /customers/{id}/sim-cards`

---

### InvoiceLineItems

**Description:** Structured display of all invoice fields matching the PDF layout structure.
**Pages:** Invoice Detail

**Props:**
```typescript
interface InvoiceLineItemsProps {
  invoice: InvoiceDetail
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| draft | Editable fields highlighted | `--color-brand-secondary` bg on editable rows |
| sent | Read-only | Normal |
| paid | Read-only + paid indicator | `--color-status-success` indicator |

**Token references:**
- Line label: `--color-text-secondary`, `--font-size-sm`
- Line amount: `--font-family-mono`, `--font-size-sm`, `--font-weight-medium`
- Total row: `--font-size-md`, `--font-weight-bold`
- Separator: `--color-border`

**Contract:** `GET /invoices/{id}`

---

### InvoiceActions

**Description:** Context-aware action buttons based on invoice status. Admin: send, mark paid, download PDF. Company: download PDF, update rolling advance.
**Pages:** Invoice Detail

**Props:**
```typescript
interface InvoiceActionsProps {
  invoice: InvoiceDetail
  role: 'admin' | 'company'
  onSend: () => void
  onMarkPaid: () => void
  onDownloadPdf: () => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| draft | Send button primary | "Send Invoice" in `--color-brand-primary` |
| sent | Mark paid + download | Two secondary buttons |
| paid | Download only | Single ghost button |

**Token references:** Inherits from `btn-primary`, `btn-secondary`, `btn-ghost`

**Contracts:** `POST /invoices/{id}/send`, `POST /invoices/{id}/mark-paid`, `GET /invoices/{id}/pdf`

---

### CostBreakdownView

**Description:** Monthly cost breakdown showing SIM fees and request fees as line items with total.
**Pages:** Customer Detail (Cost Breakdown tab), My Monthly Costs

**Props:**
```typescript
interface CostBreakdownViewProps {
  customerId: string
  month: number
  year: number
  role: 'admin' | 'company' | 'customer'
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Skeleton lines | — |
| empty | No charges for period | "No charges this month" empty state |
| populated | Fee lines + total | SIM fee lines, request fee lines, bold total |

**Token references:**
- SIM line: `--color-text-secondary` label, `--font-family-mono` amount
- Request line: same
- Total row: `--font-weight-bold`, `--color-text-primary`
- Total border-top: `--color-border-strong`

**Contract:** `GET /customers/{id}/cost-breakdown`

---

### SystemSettingsForm

**Description:** Five-field form for bank account holder, IBAN, SWIFT, company name, company address.
**Pages:** Settings

**Props:**
```typescript
interface SystemSettingsFormProps {}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| loading | Fetching current settings | Field skeletons |
| populated | Fields pre-filled | — |
| saving | PUT in flight | Submit button spinner |
| saved | Success | Success toast |

**Token references:**
- IBAN/SWIFT inputs: `--font-family-mono`
- Form gap: `--space-4`

**Contracts:** `GET /settings`, `PUT /settings`

---

### CreateCustomerModal / EditCustomerModal

**Description:** Modals for creating and editing customer records. Reuse the same field set (name, contact_info, whatsapp_group_id).
**Pages:** Customer List (create), Customer Detail (edit)

**Props:**
```typescript
interface CreateCustomerModalProps {
  isOpen: boolean
  onClose: () => void
}
interface EditCustomerModalProps {
  customer: CustomerDetail
  isOpen: boolean
  onClose: () => void
}
```

**States:** idle | submitting | error

**Token references:** Inherits from `modal` and `input` token classes

**Contracts:** `POST /customers`, `PATCH /customers/{id}`

---

### CreatePhoneModal / EditPhoneModal

**Description:** Modals for creating and editing phone records.
**Pages:** Customer Detail

**Props:**
```typescript
interface CreatePhoneModalProps {
  customerId: string
  isOpen: boolean
  onClose: () => void
}
interface EditPhoneModalProps {
  phone: PhoneSummary
  isOpen: boolean
  onClose: () => void
}
```

**States:** idle | submitting | error

**Contract:** `POST /customers/{id}/phones`, `PATCH /phones/{id}`

---

### CreateSimCardModal / EditSimCardModal / ActualAmountModal

**Description:** Modals for creating SIM cards, editing SIM card details, and entering the actual postpaid amount at month-end.
**Pages:** Customer Detail

**Props:**
```typescript
interface CreateSimCardModalProps {
  customerId: string
  phones: PhoneSummary[]
  isOpen: boolean
  onClose: () => void
}
interface ActualAmountModalProps {
  simCard: SimCardSummary
  isOpen: boolean
  onClose: () => void
}
```

**States:** idle | submitting | error

**Contracts:** `POST /customers/{id}/sim-cards`, `PATCH /sim-cards/{id}`, `PUT /sim-cards/{id}/monthly-billing`

---

### CreateUserModal / EditUserModal

**Description:** Modals for creating and editing user accounts.
**Pages:** User Management

**Props:**
```typescript
interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
}
interface EditUserModalProps {
  user: UserSummary
  isOpen: boolean
  onClose: () => void
}
```

**States:** idle | submitting | error

**Contracts:** `POST /users`, `PATCH /users/{id}`

---

### ConfirmDialog

**Description:** Destructive action confirmation modal used before deactivating users and other irreversible operations.
**Pages:** User Management, Invoice Detail

**Props:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}
```

**States:** idle | confirming (spinner on confirm button)

**Token references:**
- Confirm button (destructive): `--color-status-error-bg`, `--color-status-error`
- Modal shadow: `--shadow-xl`

**Contract:** None (action passed via `onConfirm`)

---

### Pagination

**Description:** Page navigation controls (previous/next + page numbers).
**Pages:** Customer List, Request List, Invoice List, User Management

**Props:**
```typescript
interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}
```

**States:**
| State | Description | Visual treatment |
|-------|-------------|-----------------|
| first-page | Previous disabled | Previous button at `--color-text-disabled` |
| last-page | Next disabled | Next button at `--color-text-disabled` |
| default | Both active | — |

**Token references:**
- Active page: `--color-brand-primary` bg, white text
- Inactive: `--color-surface` bg, `--color-border` border
- Radius: `--radius-md`

**Contract:** None (drives query param)

---

### SearchInput

**Description:** Debounced text input for filtering list views.
**Pages:** Customer List

**Props:**
```typescript
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}
```

**Token references:**
- Input border: `--color-border-strong`
- Focus ring: `--color-brand-primary`

**Contract:** None (drives query param)

---

### MonthPicker

**Description:** Month + year selector for cost breakdown history navigation.
**Pages:** My Monthly Costs

**Props:**
```typescript
interface MonthPickerProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
}
```

**Token references:**
- Selected: `--color-brand-primary`
- Border: `--color-border-strong`

**Contract:** None (drives query params for `GET /customers/{id}/cost-breakdown`)

---

## Navigation structure

- **Pattern:** Persistent left sidebar (220px) + fixed top bar (52px). Desktop-first layout.
- **Mobile:** Sidebar collapses to overlay drawer triggered by hamburger button in top bar at `< 768px` (`--breakpoint-md`). Overlay on `--z-overlay`.
- **Desktop:** Sidebar always visible. Can be collapsed to icon-only mode (56px) by toggle button at bottom of sidebar.
- **Auth gates:** All routes under `/(main)/` check for valid access token cookie on the server. Unauthenticated requests are redirected to `/login`.
- **Role gates:**
  - `/overview`, `/customers`, `/customers/[id]`, `/requests`, `/requests/[id]`, `/billing`, `/billing/[id]` — accessible by admin and company. Customer redirect to `/phones`.
  - `/settings`, `/users` — admin only. Other roles redirect to `/overview`.
  - `/phones`, `/sim-cards`, `/costs`, `/history` — customer only. Admin/company redirect to `/overview`.
  - `/requests/new` — company and customer. Admin has no need to submit requests (they process them).
  - `/customers/[id]` — customer role may only access their own `customer_id`; any other ID returns 403.

**Sidebar items by role:**

| Label | Route | Admin | Company | Customer |
|-------|-------|-------|---------|----------|
| Overview | `/overview` | ✓ | ✓ | — |
| Customers | `/customers` | ✓ | ✓ | — |
| Requests | `/requests` | ✓ | ✓ | ✓ |
| Billing | `/billing` | ✓ | ✓ | — |
| Settings | `/settings` | ✓ | — | — |
| Users | `/users` | ✓ | — | — |
| My Phones | `/phones` | — | — | ✓ |
| My SIM Cards | `/sim-cards` | — | — | ✓ |
| My Monthly Costs | `/costs` | — | — | ✓ |
| My History | `/history` | — | — | ✓ |

---

## State management

- **Server state:** TanStack Query v5 — manages all API data. Keys are structured as `['customers', id]`, `['requests', { status, type, ... }]`, etc. Stale time: 30 seconds for lists, 60 seconds for detail views. Mutations invalidate relevant query keys on success.
- **Global client state:** Zustand — single `useAuthStore` with shape `{ user: UserSummary | null, setUser, clearUser }`. Populated from `/auth/login` and `/auth/refresh` responses. Cleared on logout.
- **Local component state:** `useState` — modal open/closed, active tab index, form field values, file drag state, filter selections, selected page number.
- **Persistent state:** JWT tokens in httpOnly cookies (managed entirely by server `Set-Cookie` headers — not readable by client JS). Sidebar collapsed preference in `localStorage` key `sidebar_collapsed`.

---

## Platform constraints

### Web

- **Breakpoints:** Per `design/tokens.md` — `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- **Browser support:** Last 2 major versions of Chrome, Firefox, Safari, Edge. No IE support.
- **Accessibility:** WCAG 2.1 AA minimum. All form inputs must have associated `<label>` elements. All icon-only buttons must have `aria-label`. Color is never the only status indicator — `StatusBadge` always includes a dot and text label. Focus rings visible on all interactive elements using `--color-brand-primary` ring.
- **Touch targets:** Minimum 44px height on all interactive elements (buttons, nav items, table rows, card CTAs).

### Mobile

N/A — Mobile app is out of scope for MVP. See `vision.md` Section 11. The web dashboard is responsive to 768px for the customer role but is not a native mobile app.
