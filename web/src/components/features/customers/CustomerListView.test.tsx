import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerListView } from './CustomerListView'
import type { CustomerSummary, PagedResponse } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('./CreateCustomerModal', () => ({
  CreateCustomerModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="create-modal"><button onClick={onClose}>Close</button></div>
  ),
}))

const mockGetCustomers = vi.fn()
vi.mock('@/lib/data/customers', () => ({
  getCustomers: (...args: unknown[]) => mockGetCustomers(...args),
}))

const mockIsAdmin = vi.fn(() => true)
vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean }) => unknown) =>
    selector({ isAdmin: mockIsAdmin }),
}))

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (v: string) => v,
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeCustomer(overrides: Partial<CustomerSummary> = {}): CustomerSummary {
  return {
    id: 'c1',
    name: 'TechCorp ME',
    contact_info: '+971 50 123 4567',
    phone_count: 8,
    sim_card_count: 12,
    open_request_count: 2,
    current_month_cost: 1240,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function pagedOf(items: CustomerSummary[], total = items.length): PagedResponse<CustomerSummary> {
  return { content: items, total_elements: total, total_pages: 1, page: 0, size: 20 }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CustomerListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
  })

  // Page header
  it('renders Customers heading', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeInTheDocument()
  })

  it('shows total count once data loads', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([makeCustomer()], 42))
    render(<CustomerListView />, { wrapper })
    expect(await screen.findByText('42 total')).toBeInTheDocument()
  })

  it('shows "+ New customer" button for admin', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    expect(screen.getByRole('button', { name: '+ New customer' })).toBeInTheDocument()
  })

  it('hides "+ New customer" button for non-admin', async () => {
    mockIsAdmin.mockReturnValue(false)
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    expect(screen.queryByRole('button', { name: '+ New customer' })).not.toBeInTheDocument()
  })

  // Toolbar
  it('renders search input with correct placeholder', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    expect(screen.getByPlaceholderText('Search by name…')).toBeInTheDocument()
  })

  it('renders Filter button', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument()
  })

  // Desktop table headers
  it('renders table column headers', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Phones')).toBeInTheDocument()
    expect(screen.getByText('SIM Cards')).toBeInTheDocument()
    expect(screen.getByText('Open Req.')).toBeInTheDocument()
    expect(screen.getByText('Current Month')).toBeInTheDocument()
    expect(screen.queryByText('View')).not.toBeInTheDocument()
  })

  // Desktop open request badge
  it('desktop: open_request_count > 0 shows warning badge with number', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([makeCustomer({ open_request_count: 3 })]))
    render(<CustomerListView />, { wrapper })
    // desktop shows "3" (number only); mobile shows "3 open" — both render in tests
    await screen.findAllByText('TechCorp ME')
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  it('desktop: open_request_count = 0 shows neutral badge (not warning)', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([makeCustomer({ open_request_count: 0 })]))
    render(<CustomerListView />, { wrapper })
    await screen.findAllByText('TechCorp ME')
    // desktop badge text is "0", mobile badge text is "0 open" — find the desktop "0" badge
    const desktopBadge = screen.getAllByText('0')[0]
    expect(desktopBadge.className).not.toContain('text-status-warning')
  })

  // Mobile badge
  it('mobile: open_request_count > 0 shows warning badge "N open"', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([makeCustomer({ open_request_count: 5 })]))
    render(<CustomerListView />, { wrapper })
    expect(await screen.findByText('5 open')).toBeInTheDocument()
  })

  it('mobile: open_request_count = 0 shows success badge "0 open"', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([makeCustomer({ open_request_count: 0 })]))
    render(<CustomerListView />, { wrapper })
    const badge = await screen.findByText('0 open')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('text-status-success')
    expect(badge.className).not.toContain('text-status-warning')
  })

  // Mobile stats row
  it('mobile: renders separate phone, SIM, cost spans', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([
      makeCustomer({ phone_count: 8, sim_card_count: 12, current_month_cost: 1240 }),
    ]))
    render(<CustomerListView />, { wrapper })
    expect(await screen.findByText('8 phones')).toBeInTheDocument()
    expect(screen.getByText('12 SIMs')).toBeInTheDocument()
    expect(screen.getByText('€1240.00/mo')).toBeInTheDocument()
  })

  // Empty state
  it('shows empty state when no customers', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    // both desktop and mobile render EmptyState in tests
    const matches = await screen.findAllByText('No customers yet')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('empty state shows Add customer button for admin', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    // both desktop table and mobile list render EmptyState simultaneously in tests
    const btns = await screen.findAllByRole('button', { name: 'Add customer' })
    expect(btns.length).toBeGreaterThan(0)
  })

  it('empty state hides Add customer button for non-admin', async () => {
    mockIsAdmin.mockReturnValue(false)
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    await screen.findAllByText('No customers yet')
    expect(screen.queryAllByRole('button', { name: 'Add customer' })).toHaveLength(0)
  })

  it('empty state description matches design copy', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    const matches = await screen.findAllByText(
      'Create your first customer record to begin managing their phones, SIM cards, and requests.'
    )
    expect(matches.length).toBeGreaterThan(0)
  })

  it('empty state with search shows no-match copy and hides Add button', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'xyz' } })
    const matches = await screen.findAllByText('No customers match')
    expect(matches.length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('button', { name: 'Add customer' })).toHaveLength(0)
  })

  // Create modal
  it('opens create modal when "+ New customer" clicked', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: '+ New customer' }))
    expect(screen.getByTestId('create-modal')).toBeInTheDocument()
  })

  it('opens create modal from empty state Add customer button', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    const [firstBtn] = await screen.findAllByRole('button', { name: 'Add customer' })
    fireEvent.click(firstBtn)
    expect(screen.getByTestId('create-modal')).toBeInTheDocument()
  })

  it('closes create modal on onClose', async () => {
    mockGetCustomers.mockResolvedValue(pagedOf([]))
    render(<CustomerListView />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: '+ New customer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument())
  })
})
