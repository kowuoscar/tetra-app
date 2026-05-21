const BASE_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function apiClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const extraHeaders: Record<string, string> = {}

  if (typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const token = cookieStore.get('access_token')
      if (token) extraHeaders['Cookie'] = `access_token=${token.value}`
    } catch {
      // outside request context (e.g. build time)
    }
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...extraHeaders, ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errorObj = body.error ?? body
    throw Object.assign(new Error(errorObj.message ?? 'Request failed'), {
      status: res.status,
      code: errorObj.code ?? 'unknown_error',
    })
  }
  return res.json() as Promise<T>
}
