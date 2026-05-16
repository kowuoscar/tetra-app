import { redirect } from 'next/navigation'
import type { UserSummary, UserRole } from '@/types'

export function requireRole(user: UserSummary, ...roles: UserRole[]) {
  if (!roles.includes(user.role)) redirect('/overview')
}
