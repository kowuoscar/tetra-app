export type UserRole = 'admin' | 'company' | 'customer'

export type UserSummary = {
  id: string
  email: string
  name: string
  role: UserRole
  customer_id: string | null
  is_active: boolean
  created_at: string
}
