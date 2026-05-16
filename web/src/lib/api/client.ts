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
    const error = await res.json().catch(() => ({ code: 'unknown_error' }))
    throw Object.assign(new Error(error.message ?? 'Request failed'), {
      status: res.status,
      code: error.code,
    })
  }
  return res.json() as Promise<T>
}
