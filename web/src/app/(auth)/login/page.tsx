import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/features/auth/LoginForm'

export default async function LoginPage() {
  const cookieStore = await cookies()
  if (cookieStore.has('access_token')) redirect('/overview')
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Tetra Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
      </div>
      <LoginForm />
    </div>
  )
}
