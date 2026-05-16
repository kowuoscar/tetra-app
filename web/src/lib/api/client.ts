const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function apiClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
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
