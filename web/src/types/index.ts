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

export type SimProvider = 'FREE' | 'ORANGE' | 'BOUYGUES' | 'SFR' | 'CORIOLIS'

export type PhoneSummary = {
  id: string
  model: string
  ownership: 'customer' | 'company'
  status: 'active' | 'in_repair' | 'replaced'
  customer_id: string
  sim_card: {
    id: string
    type: 'prepaid' | 'postpaid'
    base_monthly_fee: number
    provider: SimProvider | null
    number: string | null
  } | null
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
  provider: SimProvider | null
  number: string | null
}

export type RequestType =
  | 'phone_repair' | 'phone_replacement' | 'sim_topup'
  | 'new_sim' | 'manual_support' | 'onboarding'

export type RequestStatus = 'submitted' | 'in_progress' | 'done'

export type AttachmentSummary = {
  id: string
  uploaded_by_user_id: string
  created_at: string
}

export type RequestSummary = {
  id: string
  customer_id: string
  customer_name: string
  type: RequestType
  status: RequestStatus
  author: 'customer' | 'company'
  fee: number | null
  created_at: string
  done_at: string | null
}

export type RequestPart = { id: string; description: string; cost: number }

export type RequestDetail = RequestSummary & {
  notes: string | null
  phone_id: string | null
  sim_card_id: string | null
  updated_at: string
  parts: RequestPart[]
  attachments: AttachmentSummary[]
  time_spent_minutes: number | null
}

export type CostBreakdown = {
  period_month: number
  period_year: number
  sim_fees: Array<{ sim_card_id: string; sim_card_type: string; amount: number; is_actual: boolean }>
  request_fees: Array<{ request_id: string; request_type: string; amount: number }>
  total: number
}
