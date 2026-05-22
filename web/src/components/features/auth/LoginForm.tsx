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
  invalid_credentials: 'Invalid email or password.',
  account_deactivated: 'Your account has been deactivated.',
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

  const hasError = state === 'error'

  return (
    <form onSubmit={handleSubmit} className="bg-surface shadow-md rounded-xl p-8 space-y-5">
      {hasError && (
        <div className="bg-status-errorBg text-status-error border border-status-error/20 rounded-lg px-4 py-3 text-sm flex items-start gap-2.5">
          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
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
          className={hasError ? 'border-status-error focus-visible:ring-status-error/30' : ''}
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
          className={hasError ? 'border-status-error focus-visible:ring-status-error/30' : ''}
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
