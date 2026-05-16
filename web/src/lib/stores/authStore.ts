import { create } from 'zustand'
import type { UserSummary } from '@/types'

type AuthStore = {
  user: UserSummary | null
  setUser: (user: UserSummary | null) => void
  isAdmin: () => boolean
  isCompany: () => boolean
  isCustomer: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAdmin: () => get().user?.role === 'admin',
  isCompany: () => get().user?.role === 'company',
  isCustomer: () => get().user?.role === 'customer',
}))
