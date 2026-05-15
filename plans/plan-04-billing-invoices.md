# Plan 04 — Billing & Invoices

## Goal

Admin can generate monthly invoices for customers (freezing SIM fees + request fees + support expenses), download a PDF, and mark invoices as sent or paid. Customer can view own invoices. PDF is generated in-JVM via Thymeleaf + OpenPDF and stored in MinIO.

## Depends on

- plan-03: RequestService, AttachmentService, StorageService, cost breakdown with request_fees all in place

## Tasks

Listed in execution order. Tasks marked [parallel] can run concurrently.

- [ ] `tasks/plan-04-billing-invoices/00-backend-invoice-entity.md` — Invoice, InvoiceLineItem entities + repositories + invoice_number_seq
- [ ] `tasks/plan-04-billing-invoices/01-backend-invoice-pdf.md` — Thymeleaf template + OpenPDF InvoicePdfService [depends on 00]
- [ ] `tasks/plan-04-billing-invoices/02-backend-invoice-service.md` — generate/list/get/PATCH + MinIO storage + InvoiceSentEvent [depends on 00, 01]
- [ ] `tasks/plan-04-billing-invoices/03-frontend-invoice-list.md` — /invoices page with filters [depends on 02]
- [ ] `tasks/plan-04-billing-invoices/04-frontend-invoice-detail.md` — /invoices/[id] with PDF download + status update [depends on 02] [parallel with 03]

## Validation

At the end of this plan, a human reviewer confirms:

- Admin generates invoice for a customer with period month/year → invoice appears with status `draft`
- Invoice detail shows correct SIM fee + request fee line items + support_expenses + total
- PDF download button fetches presigned URL and opens PDF in browser
- Admin marks invoice as `sent` → `sent_at` populated; then `paid` → `paid_at` populated
- Customer can view own invoices; cannot view other customers' invoices
- `paid → *` transition rejected (terminal)
- `mvn verify` and `pnpm build` pass
