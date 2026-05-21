'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRequest, updateRequest, addPart, deletePart, uploadAttachment, downloadAttachment } from '@/lib/data/requests'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { RequestStatus } from '@/types'

const INPUT_CLS =
  'h-8 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-50'

const NATIVE_SELECT_CLS =
  'h-8 rounded-lg border border-border bg-surface px-2.5 text-sm text-text-primary cursor-pointer outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50'

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  done: 'Done',
}

const STATUS_BADGE: Record<RequestStatus, string> = {
  submitted: 'bg-status-info/10 text-status-info border-status-info/30',
  in_progress: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  done: 'bg-status-success/10 text-status-success border-status-success/30',
}

const TYPE_LABELS: Record<string, string> = {
  phone_repair: 'Phone repair',
  phone_replacement: 'Phone replacement',
  sim_topup: 'SIM top-up',
  new_sim: 'New SIM',
  manual_support: 'Manual support',
  onboarding: 'Onboarding',
}

const STEP_ORDER: RequestStatus[] = ['submitted', 'in_progress', 'done']

function StatusStepper({ status }: { status: RequestStatus }) {
  const current = STEP_ORDER.indexOf(status)
  return (
    <div className="flex items-center">
      {STEP_ORDER.map((s, i) => {
        const isPast = i < current
        const isActive = i === current
        return (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0',
                  isPast
                    ? 'bg-status-success/10 text-status-success'
                    : isActive
                    ? 'bg-brand-primary text-white'
                    : 'bg-surface-raised text-text-disabled',
                ].join(' ')}
              >
                {isPast ? '✓' : i + 1}
              </div>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap',
                  isPast ? 'text-status-success' : isActive ? 'text-brand-primary' : 'text-text-disabled',
                ].join(' ')}
              >
                {STATUS_LABELS[s]}
              </span>
            </div>
            {i < STEP_ORDER.length - 1 && (
              <div className={['flex-1 h-px mx-3 min-w-5', isPast ? 'bg-status-success' : 'bg-border'].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  requestId: string
}

export function RequestDetailView({ requestId }: Props) {
  const qc = useQueryClient()
  const isAdmin = useAuthStore(s => s.isAdmin())
  const isAdminOrCompany = useAuthStore(s => s.isAdmin() || s.isCompany())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => getRequest(requestId),
  })

  const [pendingStatus, setPendingStatus] = useState<RequestStatus | ''>('')
  const [feeValue, setFeeValue] = useState('')
  const [editingFee, setEditingFee] = useState(false)
  const [partDesc, setPartDesc] = useState('')
  const [partCost, setPartCost] = useState('')
  const [addingPart, setAddingPart] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['request', requestId] })

  const statusMutation = useMutation({
    mutationFn: (status: RequestStatus) => updateRequest(requestId, { status }),
    onSuccess: () => { setPendingStatus(''); invalidate() },
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { await uploadAttachment(requestId, file); invalidate() }
    catch (e: unknown) { setError((e as { message?: string }).message ?? 'Upload failed') }
    finally { setUploading(false); e.target.value = '' }
  }

  if (isLoading || !req) {
    return (
      <div className="space-y-5 max-w-5xl animate-pulse">
        <div className="bg-surface border border-border rounded-xl px-6 py-5 space-y-3">
          <div className="h-5 bg-surface-raised rounded w-40" />
          <div className="h-4 bg-surface-raised rounded w-64" />
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 340px' }}>
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5 h-24" />
            <div className="bg-surface border border-border rounded-xl p-5 h-40" />
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 h-48" />
        </div>
      </div>
    )
  }

  const availableNextStatuses = STEP_ORDER.filter(s => STEP_ORDER.indexOf(s) > STEP_ORDER.indexOf(req.status))
  const effectivePending = pendingStatus || (availableNextStatuses[0] ?? '')

  function formatTimeSpent(minutes: number) {
    const d = Math.floor(minutes / 1440)
    const h = Math.floor((minutes % 1440) / 60)
    const m = Math.round(minutes % 60)
    return [d ? `${d}d` : null, h ? `${h}h` : null, `${m}m`].filter(Boolean).join(' ')
  }

  const totalPartsAmount = req.parts.reduce((sum, p) => sum + p.cost, 0)

  return (
    <div className="space-y-5 max-w-5xl">
      {error && (
        <p className="text-sm text-status-error bg-status-error/5 border border-status-error/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Header card */}
      <div className="bg-surface border border-border rounded-xl px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-lg font-bold text-text-primary">{TYPE_LABELS[req.type] ?? req.type}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[req.status]}`}>
              {STATUS_LABELS[req.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
            <span>{req.customer_name}</span>
            {req.phone_id && <span className="text-text-disabled">·</span>}
            <span className="capitalize">by {req.author}</span>
            <span className="text-text-disabled">·</span>
            <span>{new Date(req.created_at).toLocaleDateString()}</span>
            {req.time_spent_minutes != null && isAdmin && (
              <>
                <span className="text-text-disabled">·</span>
                <span className="text-text-disabled">Time: {formatTimeSpent(req.time_spent_minutes)}</span>
              </>
            )}
          </div>
        </div>

        {isAdminOrCompany && req.status !== 'done' && availableNextStatuses.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <select
              className={`${NATIVE_SELECT_CLS} w-40`}
              value={effectivePending}
              onChange={e => setPendingStatus(e.target.value as RequestStatus)}
            >
              {availableNextStatuses.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() => effectivePending && statusMutation.mutate(effectivePending as RequestStatus)}
              disabled={statusMutation.isPending || !effectivePending}
            >
              {statusMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      {req.notes && (
        <div className="bg-surface border border-border rounded-xl px-5 py-4 text-sm">
          <p className="text-text-secondary font-medium mb-1">Notes</p>
          <p className="text-text-primary whitespace-pre-wrap">{req.notes}</p>
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Left column */}
        <div className="space-y-4">
          {/* Status stepper */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-text-primary mb-4">Status</p>
            <StatusStepper status={req.status} />
          </div>

          {/* Parts & materials */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">Parts &amp; materials</span>
              {isAdminOrCompany && req.status !== 'done' && (
                <button
                  onClick={() => setAddingPart(true)}
                  className="text-xs font-medium text-brand-primary hover:underline"
                >
                  + Add part
                </button>
              )}
            </div>
            {req.parts.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-surface-raised text-text-secondary">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Description</th>
                    <th className="px-5 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Cost</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {req.parts.map(p => (
                    <tr key={p.id}>
                      <td className="px-5 py-3 text-text-primary">{p.description}</td>
                      <td className="px-5 py-3 font-mono text-text-primary">€{p.cost.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        {isAdminOrCompany && req.status !== 'done' && (
                          <button
                            onClick={() => deletePartMutation.mutate(p.id)}
                            className="text-xs text-status-error hover:underline px-2 py-1 rounded hover:bg-status-error/5 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-raised">
                    <td className="px-5 py-2.5 text-xs text-text-secondary font-medium">Total parts</td>
                    <td className="px-5 py-2.5 font-mono text-sm font-semibold text-text-primary">€{totalPartsAmount.toFixed(2)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="px-5 py-4 text-sm text-text-secondary">No parts added yet.</p>
            )}

            {addingPart && (
              <div className="px-5 py-4 border-t border-border space-y-3 bg-surface-raised">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={partDesc}
                      onChange={e => setPartDesc(e.target.value)}
                      placeholder="Part description"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cost (€)</Label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={INPUT_CLS}
                      value={partCost}
                      onChange={e => setPartCost(e.target.value)}
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

          {/* Request fee */}
          {isAdmin && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <span className="text-sm font-semibold text-text-primary">Request fee</span>
              </div>
              <div className="px-5 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fee" className="text-xs">Fee (EUR) — billed on next invoice</Label>
                  {editingFee ? (
                    <div className="flex gap-2">
                      <input
                        id="fee"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`${INPUT_CLS} max-w-36`}
                        value={feeValue}
                        onChange={e => setFeeValue(e.target.value)}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => feeMutation.mutate(parseFloat(feeValue))}
                        disabled={!feeValue || feeMutation.isPending}
                      >
                        {feeMutation.isPending ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingFee(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        id="fee"
                        className={`${INPUT_CLS} max-w-36 font-mono`}
                        value={req.fee != null ? req.fee.toFixed(2) : ''}
                        readOnly
                        onClick={() => { setFeeValue(req.fee != null ? String(req.fee) : ''); setEditingFee(true) }}
                        placeholder="0.00"
                      />
                      <button
                        onClick={() => { setFeeValue(req.fee != null ? String(req.fee) : ''); setEditingFee(true) }}
                        className="text-xs text-brand-primary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — attachments */}
        <div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <span className="text-sm font-semibold text-text-primary">
                Attachments{req.attachments.length > 0 ? ` (${req.attachments.length})` : ''}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {req.attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {req.attachments.map(a => (
                    <button
                      key={a.id}
                      onClick={() => downloadAttachment(requestId, a.id)}
                      className="aspect-square rounded-lg border border-border bg-surface-raised flex items-center justify-center text-xs font-mono font-medium text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
                      title={`Uploaded ${new Date(a.created_at).toLocaleDateString()}`}
                    >
                      IMG
                    </button>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : '+ Upload photo'}
              </button>
              <p className="text-xs text-text-disabled text-center">JPEG, PNG, WebP · max 10 MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
