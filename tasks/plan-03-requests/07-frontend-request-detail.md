# Frontend — Request Detail Page

## Domain

frontend

## Plan

`plans/plan-03-requests.md`

## Depends on

- `tasks/plan-03-requests/02-backend-request-service.md` — GET /requests/{id}, PATCH /requests/{id}, POST/DELETE /requests/{id}/parts
- `tasks/plan-03-requests/03-backend-attachments.md` — POST/GET /requests/{id}/attachments/{attachmentId}

## References

- `specs/frontend.md#request-detail`
- `docs/contracts.md#get-requestsid`

## Context

`/requests/[id]` page. Renders request info, parts list, attachments, status badge. Admin sees status update controls and add/remove part forms. All roles can upload attachments. Attachments are embedded in `RequestDetail` (no separate list fetch). Download via binary stream from backend with fetch+blob (credentials included).

**Corrected field names (per contracts.md):**
- `req.notes` (not `req.description`)
- `req.fee` — direct nullable field (not `total_fee`)
- Parts: `description` + `cost` (not `name` + `fee`)
- Attachments: `AttachmentSummary = { id, uploaded_by_user_id, created_at }` — no filename/download_url
- Allowed upload types: image/jpeg, image/png, image/webp (not PDF)
- Max upload size: 10 MB

---

### Inlined spec excerpts

**Route:** `/requests/[id]` — all roles (customer own only)

**Sections:**
- Header: type, status badge, customer name, created date
- Notes block (if present)
- Admin fee display (req.fee nullable)
- Parts table (description, cost) — admin: add/remove inline
- Status update control — admin/company only
- Attachments — upload button + list; download via fetch+blob

**PATCH body:** `{ status?, notes?, fee? }` (fee admin-only)

---

## Implementation

### 1. Data functions

Add to `src/lib/data/requests.ts`:
```typescript
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
```

### 2. Page

`src/app/(main)/requests/[id]/page.tsx` — Server Component:
```tsx
import { getMe } from '@/lib/data/auth'
import { RequestDetailView } from '@/components/features/requests/RequestDetailView'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const user = await getMe()
  return <RequestDetailView requestId={params.id} userRole={user?.role ?? 'customer'} />
}
```

### 3. RequestDetailView — `"use client"`

`src/components/features/requests/RequestDetailView.tsx`:

```tsx
'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRequest, updateRequest, addPart, deletePart,
         uploadAttachment, downloadAttachment } from '@/lib/data/requests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RequestStatus } from '@/types'

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted:   'bg-status-warning-bg text-status-warning',
  in_progress: 'bg-blue-50 text-blue-700',
  done:        'bg-status-success-bg text-status-success',
}

const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted:   ['in_progress'],
  in_progress: ['done'],
  done:        [],
}

export function RequestDetailView({
  requestId, userRole,
}: { requestId: string; userRole: string }) {
  const qc = useQueryClient()
  const isAdmin = userRole === 'admin'
  const isAdminOrCompany = userRole === 'admin' || userRole === 'company'
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: req, isLoading, error } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => getRequest(requestId),
  })

  const [newStatus, setNewStatus] = useState<RequestStatus | ''>('')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [partDesc, setPartDesc] = useState('')
  const [partCost, setPartCost] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const invalidateRequest = () => qc.invalidateQueries({ queryKey: ['request', requestId] })

  const statusMutation = useMutation({
    mutationFn: (status: RequestStatus) => updateRequest(requestId, { status }),
    onSuccess: () => { invalidateRequest(); setNewStatus('') },
    onError: (e: unknown) => setStatusError((e as { message?: string }).message ?? 'Update failed'),
  })

  const addPartMutation = useMutation({
    mutationFn: () => addPart(requestId, {
      description: partDesc,
      cost: parseFloat(partCost),
    }),
    onSuccess: () => { invalidateRequest(); setPartDesc(''); setPartCost('') },
  })

  const deletePartMutation = useMutation({
    mutationFn: (partId: string) => deletePart(requestId, partId),
    onSuccess: invalidateRequest,
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError(null)
    try {
      await uploadAttachment(requestId, file)
      invalidateRequest()
    } catch {
      setUploadError('Upload failed. JPEG, PNG or WebP only · max 10 MB.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDownload(attachmentId: string) {
    setDownloading(attachmentId)
    try {
      await downloadAttachment(requestId, attachmentId)
    } catch {
      // silent — download errors are rare
    } finally {
      setDownloading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-bg-tertiary rounded-xl animate-pulse" />)}
      </div>
    )
  }
  if (error || !req) {
    return <p className="text-status-error text-sm">Request not found or access denied.</p>
  }

  const availableTransitions = STATUS_TRANSITIONS[req.status]

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary capitalize">
            {req.type.replace(/_/g, ' ')}
          </h1>
          <p className="text-sm text-text-secondary mt-1">{req.customer_name}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {new Date(req.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
          {req.status.replace('_', ' ')}
        </span>
      </div>

      {/* Notes */}
      {req.notes && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{req.notes}</p>
        </div>
      )}

      {/* Fee (admin-set, nullable) */}
      {req.fee != null && (
        <p className="text-sm text-text-secondary">
          Fee: <span className="font-medium text-text-primary">{req.fee.toFixed(2)} AED</span>
        </p>
      )}

      {/* Time spent (admin, done) */}
      {isAdmin && req.time_spent_minutes != null && (
        <p className="text-sm text-text-secondary">
          Time spent: <span className="font-medium text-text-primary">{req.time_spent_minutes} min</span>
        </p>
      )}

      {/* Status update (admin/company) */}
      {isAdminOrCompany && availableTransitions.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Update Status</p>
          {statusError && <p className="text-xs text-status-error">{statusError}</p>}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Select value={newStatus}
                onValueChange={v => { setNewStatus(v as RequestStatus); setStatusError(null) }}>
                <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
                <SelectContent>
                  {availableTransitions.map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!newStatus || statusMutation.isPending}
              onClick={() => newStatus && statusMutation.mutate(newStatus as RequestStatus)}
            >
              {statusMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Parts */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Parts</p>

        {req.parts.length === 0 ? (
          <p className="text-sm text-text-secondary">No parts added.</p>
        ) : (
          <div className="divide-y divide-border">
            {req.parts.map(part => (
              <div key={part.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-text-primary">{part.description}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">{part.cost.toFixed(2)} AED</span>
                  {isAdmin && (
                    <button
                      onClick={() => deletePartMutation.mutate(part.id)}
                      className="text-xs text-status-error hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Description"
              value={partDesc}
              onChange={e => setPartDesc(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Cost"
              type="number"
              min="0.01"
              step="0.01"
              value={partCost}
              onChange={e => setPartCost(e.target.value)}
              className="w-28"
            />
            <Button
              size="sm"
              disabled={!partDesc.trim() || !partCost || addPartMutation.isPending}
              onClick={() => addPartMutation.mutate()}
            >
              Add
            </Button>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Attachments</p>

        {uploadError && <p className="text-xs text-status-error">{uploadError}</p>}

        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload File'}
          </Button>
          <span className="text-xs text-text-secondary">JPEG, PNG or WebP · max 10 MB</span>
        </div>

        {req.attachments.length === 0 ? (
          <p className="text-sm text-text-secondary">No attachments.</p>
        ) : (
          <div className="space-y-1">
            {req.attachments.map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => handleDownload(a.id)}
                  disabled={downloading === a.id}
                  className="text-brand-primary hover:underline disabled:opacity-50"
                >
                  {downloading === a.id ? 'Downloading…' : 'Download'}
                </button>
                <span className="text-text-secondary text-xs">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Acceptance criteria

- [ ] `/requests/[id]` shows type, status badge, customer name, `notes` field (not `description`)
- [ ] Parts show `description`/`cost` columns; admin add form uses same field names
- [ ] Admin can set `fee` via PATCH (separate from parts)
- [ ] Attachment upload: JPEG/PNG/WebP only, max 10 MB; error shown on wrong type
- [ ] Download button fetches binary stream with credentials, triggers browser download
- [ ] Attachments list comes from `req.attachments` (embedded in RequestDetail — no separate fetch)
- [ ] `pnpm build` exits 0, no type errors

## Automated checks

```bash
cd web
pnpm tsc --noEmit
pnpm build
```
