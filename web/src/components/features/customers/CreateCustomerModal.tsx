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
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-4">
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
                Company name <span className="text-status-error">*</span>
              </Label>
              <Input id="name" name="name" required disabled={submitting} placeholder="e.g. Al Barsha Trading LLC" />
              <p className="text-xs text-text-secondary">Legal entity name as registered</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_info">
                Contact info{' '}
                <span className="text-text-disabled font-normal">(optional)</span>
              </Label>
              <Input
                id="contact_info"
                name="contact_info"
                disabled={submitting}
                placeholder="+971 50 123 4567 or email"
              />
              <p className="text-xs text-text-secondary">Phone number, email, or other contact — can be added later</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp_group_id">
                WhatsApp group ID{' '}
                <span className="text-text-disabled font-normal">(optional)</span>
              </Label>
              <Input
                id="whatsapp_group_id"
                name="whatsapp_group_id"
                disabled={submitting}
                placeholder="e.g. 120363012345678901@g.us"
              />
              <p className="text-xs text-text-secondary">Required before WhatsApp notifications can be sent — can be added later</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-bg-secondary">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
