'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api/client'
import type { UserSummary } from '@/types'

type LoginState = 'idle' | 'submitting' | 'error'
type ErrorCode = 'invalid_credentials' | 'account_deactivated' | 'unknown'

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_credentials: 'Invalid email or password',
  account_deactivated: 'Your account has been deactivated',
  unknown: 'Something went wrong. Please try again.',
}

export function LoginForm() {
  const router = useRouter()
  const [state, setState] = useState<LoginState>('idle')
  const [errorCode, setErrorCode] = useState<ErrorCode>('unknown')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    const data = new FormData(e.currentTarget)

    try {
      const res = await apiClient<{ user: UserSummary }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: data.get('email') as string,
          password: data.get('password') as string,
        }),
      })
      router.replace(res.user.role === 'customer' ? '/phones' : '/overview')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'unknown'
      setErrorCode((ERROR_MESSAGES[code as ErrorCode] ? code : 'unknown') as ErrorCode)
      setState('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface shadow-md rounded-xl p-8 space-y-5">
      {state === 'error' && (
        <div className="bg-status-error-bg text-status-error border border-status-error/20 rounded-md px-4 py-3 text-sm">
          {ERROR_MESSAGES[errorCode]}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={state === 'submitting'}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={state === 'submitting'}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={state === 'submitting'}
      >
        {state === 'submitting' ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
