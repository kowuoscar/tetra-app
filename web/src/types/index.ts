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

export type DashboardStats = {
  total_customers: number
  total_phones: number
  total_sim_cards: number
  open_requests: number
}

export type CustomerSummary = {
  id: string
  name: string
  contact_info: string
  phone_count: number
  sim_card_count: number
  open_request_count: number
  current_month_cost: number
  created_at: string
}

export type CustomerDetail = CustomerSummary & {
  whatsapp_group_id: string
}

export type PagedResponse<T> = {
  content: T[]
  total_elements: number
  total_pages: number
  page: number
  size: number
}

export type PhoneSummary = {
  id: string
  model: string
  ownership: 'customer' | 'company'
  status: 'active' | 'in_repair' | 'replaced'
  customer_id: string
  sim_card: { id: string; type: 'prepaid' | 'postpaid'; base_monthly_fee: number } | null
  is_unused: boolean
  created_at: string
}

export type SimCardSummary = {
  id: string
  type: 'prepaid' | 'postpaid'
  base_monthly_fee: number
  status: 'active' | 'unassigned' | 'cancelled'
  customer_id: string
  phone_id: string | null
  is_unused: boolean
  created_at: string
}

export type CostBreakdown = {
  period_month: number
  period_year: number
  sim_fees: Array<{ sim_card_id: string; sim_card_type: string; amount: number; is_actual: boolean }>
  request_fees: Array<{ request_id: string; request_type: string; amount: number }>
  total: number
}
