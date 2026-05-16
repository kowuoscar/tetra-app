import { redirect } from 'next/navigation'
import { getMe } from '@/lib/data/auth'
import { AuthHydrator } from '@/components/providers/AuthHydrator'
import { AppShell } from '@/components/features/shell/AppShell'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe()
  if (!user) redirect('/login')

  return (
    <AuthHydrator user={user}>
      <AppShell user={user}>
        {children}
      </AppShell>
    </AuthHydrator>
  )
}
