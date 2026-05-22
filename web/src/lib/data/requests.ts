import { apiClient } from '@/lib/api/client'
import type { AttachmentSummary, PagedResponse, RequestDetail, RequestPart, RequestStatus, RequestSummary, RequestType } from '@/types'

export async function createRequest(data: {
  customer_id: string
  type: RequestType
  notes?: string
  phone_id?: string
  sim_card_id?: string
}): Promise<RequestDetail> {
  return apiClient('/requests', { method: 'POST', body: JSON.stringify(data) })
}

export async function getRequests(params: {
  status?: RequestStatus
  type?: RequestType
  customer_id?: string
  page?: number
  size?: number
}): Promise<PagedResponse<RequestSummary>> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.type) qs.set('type', params.type)
  if (params.customer_id) qs.set('customer_id', params.customer_id)
  if (params.page !== undefined) qs.set('page', String(params.page))
  if (params.size !== undefined) qs.set('size', String(params.size))
  return apiClient(`/requests?${qs}`)
}

export async function getRequest(id: string): Promise<RequestDetail> {
  return apiClient(`/requests/${id}`)
}

export async function updateRequest(
  id: string,
  data: { status?: RequestStatus; notes?: string; fee?: number }
): Promise<RequestDetail> {
  return apiClient(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function addPart(
  requestId: string,
  data: { description: string; cost: number }
): Promise<RequestPart> {
  return apiClient(`/requests/${requestId}/parts`, { method: 'POST', body: JSON.stringify(data) })
}

export async function deletePart(requestId: string, partId: string): Promise<void> {
  return apiClient(`/requests/${requestId}/parts/${partId}`, { method: 'DELETE' })
}

export async function uploadAttachment(
  requestId: string,
  file: File
): Promise<AttachmentSummary> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1/requests/${requestId}/attachments`,
    { method: 'POST', body: form, credentials: 'include' }
  )
  if (!res.ok) throw Object.assign(new Error('Upload failed'), { status: res.status })
  return res.json()
}

export async function downloadAttachment(
  requestId: string,
  attachmentId: string
): Promise<void> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1/requests/${requestId}/attachments/${attachmentId}`,
    { credentials: 'include' }
  )
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = attachmentId
  a.click()
  URL.revokeObjectURL(url)
}
