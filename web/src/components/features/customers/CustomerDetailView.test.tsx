import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerDetailView } from './CustomerDetailView'
import type { CustomerDetail } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('./CustomerPhonesTab',       () => ({ CustomerPhonesTab:       () => <div data-testid="phones-tab" />       }))
vi.mock('./CustomerSimCardsTab',     () => ({ CustomerSimCardsTab:     () => <div data-testid="sims-tab" />         }))
vi.mock('./CustomerRequestsTab',     () => ({ CustomerRequestsTab:     () => <div data-testid="requests-tab" />     }))
vi.mock('./CustomerCostBreakdownTab',() => ({ CustomerCostBreakdownTab:() => <div data-testid="costs-tab" />        }))

const mockUpdateCustomer = vi.fn()
vi.mock('@/lib/data/customers', () => ({
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
}))

const mockIsAdmin = vi.fn(() => true)
vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean }) => unknown) =>
    selector({ isAdmin: mockIsAdmin }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeCustomer(overrides: Partial<CustomerDetail> = {}): CustomerDetail {
  return {
    id: 'c1',
    name: 'techcorp me',
    contact_info: '+971 50 123 4567',
    whatsapp_group_id: 'grp-1',
    phone_count: 8,
    sim_card_count: 12,
    open_request_count: 2,
    current_month_cost: 1240,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CustomerDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
  })

  // Desktop header
  it('renders customer name uppercase in desktop header', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    const nameEls = screen.getAllByText('techcorp me')
    const desktopName = nameEls.find(el => el.className.includes('uppercase'))
    expect(desktopName).toBeTruthy()
  })

  it('desktop header shows contact info', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.getAllByText('+971 50 123 4567').length).toBeGreaterThan(0)
  })

  it('desktop header shows phone and SIM counts', () => {
    render(<CustomerDetailView customer={makeCustomer({ phone_count: 8, sim_card_count: 12 })} />, { wrapper })
    expect(screen.getAllByText('8 phones').length).toBeGreaterThan(0)
    expect(screen.getAllByText('12 SIM cards').length).toBeGreaterThan(0)
  })

  it('desktop header open_request_count > 0 has warning class', () => {
    render(<CustomerDetailView customer={makeCustomer({ open_request_count: 3 })} />, { wrapper })
    const matches = screen.getAllByText('3 open requests')
    const warningEl = matches.find(el => el.className.includes('text-status-warning'))
    expect(warningEl).toBeTruthy()
  })

  it('desktop header open_request_count = 0 has no warning class', () => {
    render(<CustomerDetailView customer={makeCustomer({ open_request_count: 0 })} />, { wrapper })
    const matches = screen.getAllByText('0 open requests')
    matches.forEach(el => expect(el.className).not.toContain('text-status-warning'))
  })

  it('desktop header formats cost with thousands separator and no decimals', () => {
    render(<CustomerDetailView customer={makeCustomer({ current_month_cost: 1240 })} />, { wrapper })
    expect(screen.getAllByText('€1,240/mo current').length).toBeGreaterThan(0)
  })

  it('shows Edit buttons for admin (desktop + mobile both render in happy-dom)', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'New request' })).toBeInTheDocument()
  })

  it('hides Edit and New request buttons for non-admin', () => {
    mockIsAdmin.mockReturnValue(false)
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.queryAllByRole('button', { name: 'Edit' })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'New request' })).not.toBeInTheDocument()
  })

  // Mobile sub-header
  it('mobile sub-header shows phone count as "X phones"', () => {
    render(<CustomerDetailView customer={makeCustomer({ phone_count: 8 })} />, { wrapper })
    expect(screen.getAllByText('8 phones').length).toBeGreaterThan(0)
  })

  it('mobile sub-header shows SIM count as "X SIMs"', () => {
    render(<CustomerDetailView customer={makeCustomer({ sim_card_count: 12 })} />, { wrapper })
    expect(screen.getByText('12 SIMs')).toBeInTheDocument()
  })

  it('mobile sub-header open > 0 shows "N open" with warning class', () => {
    render(<CustomerDetailView customer={makeCustomer({ open_request_count: 5 })} />, { wrapper })
    const el = screen.getByText('5 open')
    expect(el.className).toContain('text-status-warning')
  })

  it('mobile sub-header open = 0 shows "0 open" without warning class', () => {
    render(<CustomerDetailView customer={makeCustomer({ open_request_count: 0 })} />, { wrapper })
    const el = screen.getByText('0 open')
    expect(el.className).not.toContain('text-status-warning')
  })

  // Tab nav — desktop labels
  it('renders desktop tab labels', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.getAllByText('Phones').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SIM Cards').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Requests').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cost Breakdown').length).toBeGreaterThan(0)
  })

  it('renders mobile tab abbreviated labels', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.getAllByText('SIMs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Costs').length).toBeGreaterThan(0)
  })

  it('Time Tracking tab shown for admin', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.getAllByText('Time Tracking').length).toBeGreaterThan(0)
  })

  it('Time Tracking tab hidden for non-admin', () => {
    mockIsAdmin.mockReturnValue(false)
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.queryByText('Time Tracking')).not.toBeInTheDocument()
    expect(screen.queryByText('Time')).not.toBeInTheDocument()
  })

  // Tab switching
  it('Phones tab active by default', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    expect(screen.getByTestId('phones-tab')).toBeInTheDocument()
  })

  it('switches to SIM Cards tab on click', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    fireEvent.click(screen.getAllByText('SIM Cards')[0])
    expect(screen.getByTestId('sims-tab')).toBeInTheDocument()
  })

  it('switches to Requests tab on click', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    fireEvent.click(screen.getAllByText('Requests')[0])
    expect(screen.getByTestId('requests-tab')).toBeInTheDocument()
  })

  it('switches to Cost Breakdown tab on click', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    fireEvent.click(screen.getAllByText('Cost Breakdown')[0])
    expect(screen.getByTestId('costs-tab')).toBeInTheDocument()
  })

  // Edit modal
  it('opens edit modal on Edit button click', () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes edit modal on Cancel', async () => {
    render(<CustomerDetailView customer={makeCustomer()} />, { wrapper })
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
