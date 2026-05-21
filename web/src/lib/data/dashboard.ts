import { apiClient } from '@/lib/api/client'
import type { DashboardStats } from '@/types'

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient('/dashboard/stats')
}
