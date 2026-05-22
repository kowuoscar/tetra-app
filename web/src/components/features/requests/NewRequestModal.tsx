'use client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { NewRequestForm } from './NewRequestForm'
import { useAuthStore } from '@/lib/stores/authStore'

export function NewRequestModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const user = useAuthStore(s => s.user)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent maxWidth="44rem" showCloseButton>
        <DialogTitle>New Request</DialogTitle>
        <NewRequestForm
          embedded
          userRole={user?.role ?? 'customer'}
          initialCustomerId={user?.customer_id ?? undefined}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
