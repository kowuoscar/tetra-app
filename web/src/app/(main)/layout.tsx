import { redirect } from 'next/navigation'
import { getMe } from '@/lib/data/auth'
import { AuthHydrator } from '@/components/providers/AuthHydrator'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe()
  if (!user) redirect('/login')

  return (
    <AuthHydrator user={user}>
      <div className="flex h-screen bg-bg-secondary">
        <aside className="w-64 bg-surface border-r border-border flex-shrink-0" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-surface border-b border-border flex-shrink-0" />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthHydrator>
  )
}
