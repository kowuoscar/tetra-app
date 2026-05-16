import { cookies } from 'next/headers'
import type { UserSummary } from '@/types'

export async function getMe(): Promise<UserSummary | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')
  if (!token) return null
  try {
    const res = await fetch(
      `${process.env.API_URL ?? 'http://localhost:8080'}/api/v1/auth/me`,
      {
        headers: { Cookie: `access_token=${token.value}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.user as UserSummary
  } catch {
    return null
  }
}
