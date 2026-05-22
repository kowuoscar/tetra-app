import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/features/auth/LoginForm'

export default async function LoginPage() {
  const cookieStore = await cookies()
  if (cookieStore.has('access_token')) redirect('/overview')

  return (
    <div className="flex h-full">
      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-bg-secondary">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-text-primary">Tetra Dashboard</h1>
            <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
          </div>
          <LoginForm />
        </div>
      </div>

      {/* Brand panel — desktop only */}
      <div className="hidden md:flex w-[480px] shrink-0 bg-brand-primary flex-col items-center justify-center gap-8 p-12">
        <div className="w-[120px] h-[120px] rounded-full bg-white/15 flex items-center justify-center">
          <span className="text-[72px] font-bold leading-none text-white">T</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">Tetra Mobile</h2>
          <p className="text-white/70 mt-2 text-sm leading-relaxed max-w-[260px]">
            Internal operations platform for managing customers, devices, and service requests.
          </p>
        </div>
      </div>
    </div>
  )
}
