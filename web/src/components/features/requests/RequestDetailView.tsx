'use client'
import { useRef, useState, Fragment } from 'react'
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
  submitted: 'bg-status-info-bg text-status-info',
  in_progress: 'bg-status-warning-bg text-status-warning',
  done: 'bg-status-success-bg text-status-success',
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

function formatRelativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / 86400000)
  const hours = Math.floor(diffMs / 3600000)
  const mins = Math.floor(diffMs / 60000)
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (mins > 0) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  return 'just now'
}

function StatusStepper({ status }: { status: RequestStatus }) {
  const current = STEP_ORDER.indexOf(status)
  return (
    <div className="flex items-center w-full">
      {STEP_ORDER.map((s, i) => {
        const isPast = i < current
        const isActive = i === current
        return (
          <Fragment key={s}>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0',
                  isPast
                    ? 'bg-status-success/10 text-status-success'
                    : isActive
                    ? 'bg-brand-primary text-white'
                    : 'bg-bg-secondary text-text-disabled',
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
          </Fragment>
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
      <div className="space-y-5 animate-pulse">
        <div className="bg-surface border border-border rounded-xl px-6 py-5 space-y-3">
          <div className="h-5 bg-bg-secondary rounded w-40" />
          <div className="h-4 bg-bg-secondary rounded w-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
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
    <div className="space-y-5">
      {error && (
        <p className="text-sm text-status-error bg-status-error/5 border border-status-error/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Header card */}
      <div className="bg-surface border border-border rounded-xl px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-lg font-bold text-text-primary">{TYPE_LABELS[req.type] ?? req.type}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
              {STATUS_LABELS[req.status]}
            </span>
          </div>
          {/* Desktop metadata */}
          <div className="hidden sm:flex flex-wrap gap-4 text-sm text-text-secondary">
            <span>{req.customer_name}</span>
            <span>by {req.author.charAt(0).toUpperCase() + req.author.slice(1)} · {formatRelativeDate(req.created_at)}</span>
            {req.time_spent_minutes != null && isAdmin && (
              <span className="text-text-disabled">Time: {formatTimeSpent(req.time_spent_minutes)}</span>
            )}
          </div>
        </div>

        {isAdminOrCompany && req.status !== 'done' && availableNextStatuses.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
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

      {/* Mobile detail card */}
      <div className="sm:hidden bg-surface border border-border rounded-xl px-4 py-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Customer</span>
          <span className="text-text-primary font-medium">{req.customer_name}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Author</span>
          <span className="text-text-primary font-medium">{req.author.charAt(0).toUpperCase() + req.author.slice(1)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Created</span>
          <span className="text-text-primary font-medium">{formatRelativeDate(req.created_at)}</span>
        </div>
        {req.phone_id != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Phone</span>
            <span className="text-text-primary font-medium">—</span>
          </div>
        )}
        {req.time_spent_minutes != null && isAdmin && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Time</span>
            <span className="text-text-primary font-medium">{formatTimeSpent(req.time_spent_minutes)}</span>
          </div>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Status stepper — desktop only */}
          <div className="hidden sm:block bg-surface border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-text-primary mb-4">Status</p>
            <StatusStepper status={req.status} />
          </div>

          {/* Parts & materials */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                <span className="hidden sm:inline">Parts &amp; materials</span>
                <span className="sm:hidden">Parts</span>
              </span>
              {isAdminOrCompany && req.status !== 'done' && (
                <Button variant="outline" size="sm" onClick={() => setAddingPart(true)}>
                  + Add part
                </Button>
              )}
            </div>
            {req.parts.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary text-text-secondary">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-status-error hover:bg-status-error/5 h-auto px-2 py-1 text-xs"
                            onClick={() => deletePartMutation.mutate(p.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-bg-secondary">
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
              <div className="px-5 py-4 border-t border-border space-y-3 bg-bg-secondary">
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
                Attachments
                {req.attachments.length > 0 && (
                  <span className="sm:hidden"> ({req.attachments.length})</span>
                )}
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {req.attachments.map(a => (
                  <button
                    key={a.id}
                    onClick={() => downloadAttachment(requestId, a.id)}
                    className="aspect-square rounded-lg border border-border bg-bg-secondary flex items-center justify-center text-xs font-mono font-medium text-text-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
                    title={`Uploaded ${new Date(a.created_at).toLocaleDateString()}`}
                  >
                    IMG
                  </button>
                ))}
                <button
                  className="sm:hidden aspect-square rounded-lg border-2 border-dashed border-brand-primary/30 bg-brand-secondary/30 flex items-center justify-center text-xs font-medium text-brand-primary disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Add photo"
                >
                  {uploading ? '…' : '+ Add'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex w-full justify-center gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : '+ Upload photo'}
              </Button>
              <p className="hidden sm:block text-xs text-text-disabled text-center">JPEG, PNG, WebP · max 10 MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
