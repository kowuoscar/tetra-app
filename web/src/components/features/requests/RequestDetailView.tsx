'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRequest, updateRequest, addPart, deletePart, uploadAttachment, downloadAttachment } from '@/lib/data/requests'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RequestStatus } from '@/types'

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  done: 'Done',
}
const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  in_progress: 'bg-status-info/10 text-status-info border-status-info/30',
  done: 'bg-status-success/10 text-status-success border-status-success/30',
}
const TYPE_LABELS: Record<string, string> = {
  phone_repair: 'Phone Repair',
  phone_replacement: 'Phone Replacement',
  sim_topup: 'SIM Top-Up',
  new_sim: 'New SIM',
  manual_support: 'Manual Support',
  onboarding: 'Onboarding',
}

const NEXT_STATUS: Partial<Record<RequestStatus, RequestStatus>> = {
  submitted: 'in_progress',
  in_progress: 'done',
}

interface Props {
  requestId: string
  userRole: string
}

export function RequestDetailView({ requestId, userRole }: Props) {
  const qc = useQueryClient()
  const isAdmin = useAuthStore(s => s.isAdmin())
  const isAdminOrCompany = useAuthStore(s => s.isAdmin() || s.isCompany())

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => getRequest(requestId),
  })

  const [feeInput, setFeeInput] = useState('')
  const [editingFee, setEditingFee] = useState(false)
  const [partDesc, setPartDesc] = useState('')
  const [partCost, setPartCost] = useState('')
  const [addingPart, setAddingPart] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['request', requestId] })

  const statusMutation = useMutation({
    mutationFn: (status: RequestStatus) => updateRequest(requestId, { status }),
    onSuccess: invalidate,
    onError: (e: unknown) => setError((e as { message?: string }).message ?? 'Update failed'),
  })

  const feeMutation = useMutation({
    mutationFn: (fee: number) => updateRequest(requestId, { fee }),
    onSuccess: () => { setEditingFee(false); invalidate() },
    onError: (e: unknown) => setError((e as { message?: string }).message ?? 'Update failed'),
  })

  const addPartMutation = useMutation({
    mutationFn: () => addPart(requestId, { description: partDesc.trim(), cost: parseFloat(partCost) }),
    onSuccess: () => { setPartDesc(''); setPartCost(''); setAddingPart(false); invalidate() },
    onError: (e: unknown) => setError((e as { message?: string }).message ?? 'Failed to add part'),
  })

  const deletePartMutation = useMutation({
    mutationFn: (partId: string) => deletePart(requestId, partId),
    onSuccess: invalidate,
  })

  const [uploading, setUploading] = useState(false)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadAttachment(requestId, file)
      invalidate()
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (isLoading || !req) {
    return <div className="text-text-secondary text-sm py-8">Loading…</div>
  }

  const nextStatus = NEXT_STATUS[req.status]

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <p className="text-sm text-status-error bg-status-error/10 border border-status-error/30 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Header card */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-text-primary">{TYPE_LABELS[req.type] ?? req.type}</p>
            <p className="text-text-secondary">
              {req.customer_name} · {new Date(req.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[req.status]}`}>
            {STATUS_LABELS[req.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 pt-1 border-t border-border">
          <div>
            <span className="text-text-secondary">Author</span>
            <p className="text-text-primary capitalize">{req.author}</p>
          </div>
          <div>
            <span className="text-text-secondary">Fee</span>
            {editingFee && isAdmin ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={feeInput}
                  onChange={e => setFeeInput(e.target.value)}
                  className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-text-primary"
                />
                <Button size="sm" onClick={() => feeMutation.mutate(parseFloat(feeInput))} disabled={feeMutation.isPending}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingFee(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-text-primary">{req.fee != null ? `€${req.fee.toFixed(2)}` : '—'}</p>
                {isAdmin && (
                  <button
                    onClick={() => { setFeeInput(req.fee != null ? String(req.fee) : ''); setEditingFee(true) }}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
          {req.done_at && (
            <div>
              <span className="text-text-secondary">Done</span>
              <p className="text-text-primary">{new Date(req.done_at).toLocaleDateString()}</p>
            </div>
          )}
          {req.time_spent_minutes != null && isAdmin && (
            <div>
              <span className="text-text-secondary">Time spent</span>
              <p className="text-text-primary">{Math.round(req.time_spent_minutes)} min</p>
            </div>
          )}
        </div>

        {req.notes && (
          <div className="pt-2 border-t border-border">
            <span className="text-text-secondary">Notes</span>
            <p className="text-text-primary mt-1 whitespace-pre-wrap">{req.notes}</p>
          </div>
        )}
      </div>

      {/* Status advance */}
      {isAdminOrCompany && nextStatus && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => statusMutation.mutate(nextStatus)}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? 'Updating…' : `Mark as ${STATUS_LABELS[nextStatus]}`}
          </Button>
        </div>
      )}

      {/* Parts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Parts</h2>
          {isAdminOrCompany && req.status !== 'done' && (
            <Button size="sm" variant="outline" onClick={() => setAddingPart(true)}>Add Part</Button>
          )}
        </div>

        {req.parts.length === 0 && !addingPart && (
          <p className="text-sm text-text-secondary">No parts added</p>
        )}

        {req.parts.length > 0 && (
          <div className="border border-border rounded-xl divide-y divide-border text-sm">
            {req.parts.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-text-primary">{p.description}</span>
                <div className="flex items-center gap-3">
                  <span className="text-text-primary font-medium">€{p.cost.toFixed(2)}</span>
                  {isAdminOrCompany && req.status !== 'done' && (
                    <button
                      onClick={() => deletePartMutation.mutate(p.id)}
                      className="text-status-error hover:underline text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {addingPart && (
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Description</Label>
                <input
                  type="text"
                  value={partDesc}
                  onChange={e => setPartDesc(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  placeholder="Part description"
                />
              </div>
              <div className="space-y-1">
                <Label>Cost (€)</Label>
                <input
                  type="number"
                  step="0.01"
                  value={partCost}
                  onChange={e => setPartCost(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => addPartMutation.mutate()}
                disabled={!partDesc.trim() || !partCost || addPartMutation.isPending}
              >
                {addPartMutation.isPending ? 'Adding…' : 'Add'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddingPart(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Attachments</h2>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors">
              {uploading ? 'Uploading…' : 'Upload'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {req.attachments.length === 0 && (
          <p className="text-sm text-text-secondary">No attachments</p>
        )}

        {req.attachments.length > 0 && (
          <div className="border border-border rounded-xl divide-y divide-border text-sm">
            {req.attachments.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-text-primary">Attachment {i + 1}</span>
                <div className="flex items-center gap-3 text-text-secondary">
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => downloadAttachment(requestId, a.id)}
                    className="text-brand-primary hover:underline font-medium"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
