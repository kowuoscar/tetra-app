'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import type { UserSummary } from '@/types'

export function AuthHydrator({
  user,
  children,
}: {
  user: UserSummary
  children: React.ReactNode
}) {
  const setUser = useAuthStore(s => s.setUser)
  useEffect(() => { setUser(user) }, [user, setUser])
  return <>{children}</>
}
