'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NewRequestModal } from './NewRequestModal'

export function NewRequestButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>New Request</Button>
      <NewRequestModal open={open} onOpenChange={setOpen} />
    </>
  )
}
