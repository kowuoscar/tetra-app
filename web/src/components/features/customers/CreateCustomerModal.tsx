'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCustomer } from '@/lib/data/customers'

interface CreateCustomerModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateCustomerModal({ onClose, onCreated }: CreateCustomerModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const contactInfo = (formData.get('contact_info') as string).trim()
    const whatsappGroupId = (formData.get('whatsapp_group_id') as string).trim()
    try {
      await createCustomer({
        name: formData.get('name') as string,
        contact_info: contactInfo || undefined,
        whatsapp_group_id: whatsappGroupId || undefined,
      })
      onCreated()
    } catch {
      setError('Failed to create customer. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="flex items-start gap-2.5 bg-status-errorBg border border-status-error/20 text-status-error rounded-lg px-4 py-3 text-sm">
              <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-status-error">*</span>
            </Label>
            <Input id="name" name="name" required disabled={submitting} placeholder="Acme Corp" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_info">
              Contact info{' '}
              <span className="text-text-secondary font-normal">(optional)</span>
            </Label>
            <Input
              id="contact_info"
              name="contact_info"
              disabled={submitting}
              placeholder="+33 6 12 34 56 78"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_group_id">
              WhatsApp group ID{' '}
              <span className="text-text-secondary font-normal">(optional)</span>
            </Label>
            <Input
              id="whatsapp_group_id"
              name="whatsapp_group_id"
              disabled={submitting}
              placeholder="120363…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
