import { apiClient } from '@/lib/api/client'
import type { CustomerSummary, CustomerDetail, PagedResponse, PhoneSummary, SimCardSummary, CostBreakdown } from '@/types'

export async function getCustomers(params: {
  page?: number
  size?: number
  search?: string
}): Promise<PagedResponse<CustomerSummary>> {
  const qs = new URLSearchParams()
  if (params.page !== undefined) qs.set('page', String(params.page))
  if (params.size !== undefined) qs.set('size', String(params.size))
  if (params.search) qs.set('search', params.search)
  return apiClient(`/customers?${qs}`)
}

export async function createCustomer(data: {
  name: string
  contact_info?: string
  whatsapp_group_id?: string
}): Promise<CustomerDetail> {
  return apiClient('/customers', { method: 'POST', body: JSON.stringify(data) })
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  return apiClient(`/customers/${id}`)
}

export async function updateCustomer(
  id: string,
  data: { name?: string; contact_info?: string; whatsapp_group_id?: string },
): Promise<CustomerDetail> {
  return apiClient(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function getCustomerPhones(
  id: string,
  includeReplaced = false,
): Promise<{ phones: PhoneSummary[] }> {
  return apiClient(`/customers/${id}/phones?include_replaced=${includeReplaced}`)
}

export async function getCustomerSimCards(
  id: string,
  includeCancelled = false,
): Promise<{ sim_cards: SimCardSummary[] }> {
  return apiClient(`/customers/${id}/sim-cards?include_cancelled=${includeCancelled}`)
}

export async function getCostBreakdown(
  id: string,
  month: number,
  year: number,
): Promise<CostBreakdown> {
  return apiClient(`/customers/${id}/cost-breakdown?month=${month}&year=${year}`)
}

export async function createPhone(
  customerId: string,
  data: { model: string; ownership: string },
): Promise<PhoneSummary> {
  return apiClient(`/customers/${customerId}/phones`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function createSimCard(
  customerId: string,
  data: { type: string; base_monthly_fee: number; phone_id?: string; provider: string; number: string },
): Promise<SimCardSummary> {
  return apiClient(`/customers/${customerId}/sim-cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePhone(
  id: string,
  data: { model?: string; ownership?: string; status?: string },
): Promise<PhoneSummary> {
  return apiClient(`/phones/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function updateSimCard(
  id: string,
  data: { phone_id?: string | null; base_monthly_fee?: number; status?: string; provider?: string; number?: string },
): Promise<SimCardSummary> {
  return apiClient(`/sim-cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}
