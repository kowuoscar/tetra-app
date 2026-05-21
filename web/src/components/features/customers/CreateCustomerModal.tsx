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
            <p className="text-sm text-status-error">{error}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_info">Contact info <span className="text-text-secondary font-normal">(optional)</span></Label>
            <Input id="contact_info" name="contact_info" disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_group_id">WhatsApp group ID <span className="text-text-secondary font-normal">(optional)</span></Label>
            <Input id="whatsapp_group_id" name="whatsapp_group_id" disabled={submitting} />
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
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
