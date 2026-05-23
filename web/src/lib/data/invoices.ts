import { apiClient } from '@/lib/api/client'
import type { InvoiceSummary, InvoiceDetail, PagedResponse, InvoiceStatus } from '@/types'

export async function getInvoices(params: {
  status?: InvoiceStatus
  page?: number
  size?: number
}): Promise<PagedResponse<InvoiceSummary>> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.page !== undefined) qs.set('page', String(params.page))
  if (params.size !== undefined) qs.set('size', String(params.size))
  return apiClient(`/invoices?${qs}`)
}

export async function getCurrentInvoice(): Promise<InvoiceDetail> {
  return apiClient('/invoices/current')
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}`)
}

export async function patchInvoice(id: string, data: {
  support_fees?: number
  rolling_advance_current?: number
}): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function sendInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}/send`, { method: 'POST' })
}

export async function markInvoicePaid(id: string): Promise<InvoiceDetail> {
  return apiClient(`/invoices/${id}/mark-paid`, { method: 'POST' })
}

export function getInvoicePdfUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1/invoices/${id}/pdf`
}
