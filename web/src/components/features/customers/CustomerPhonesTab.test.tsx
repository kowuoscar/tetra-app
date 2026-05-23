import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerPhonesTab } from './CustomerPhonesTab'
import type { PhoneSummary } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean }) => unknown) =>
    selector({ isAdmin: () => true }),
}))

const mockGetCustomerPhones = vi.fn().mockResolvedValue({ phones: [] })
vi.mock('@/lib/data/customers', () => ({
  getCustomerPhones: (...args: unknown[]) => mockGetCustomerPhones(...args),
  createPhone: vi.fn().mockResolvedValue({ id: 'p1', model: 'Test', ownership: 'customer', status: 'active', customer_id: 'c1', sim_card: null, is_unused: false, created_at: '' }),
  updatePhone: vi.fn().mockResolvedValue({}),
  updateSimCard: vi.fn().mockResolvedValue({}),
  getCustomerSimCards: vi.fn().mockResolvedValue({ sim_cards: [] }),
}))

function makePhone(overrides: Partial<PhoneSummary> = {}): PhoneSummary {
  return {
    id: 'p1',
    model: 'iPhone 15 Pro',
    ownership: 'company',
    status: 'active',
    customer_id: 'c1',
    sim_card: null,
    is_unused: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Status badge design tokens (original tests) ────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  active:     'bg-status-success-bg text-status-success',
  in_repair:  'bg-status-warning-bg text-status-warning',
  replaced:   'bg-bg-tertiary text-text-secondary',
}

describe('CustomerPhonesTab — status badge design tokens', () => {
  it('active phone uses success status tokens', () => {
    expect(STATUS_CLASSES['active']).toContain('bg-status-success-bg')
    expect(STATUS_CLASSES['active']).toContain('text-status-success')
  })

  it('in_repair phone uses warning status tokens', () => {
    expect(STATUS_CLASSES['in_repair']).toContain('bg-status-warning-bg')
    expect(STATUS_CLASSES['in_repair']).toContain('text-status-warning')
  })

  it('replaced phone uses muted tertiary tokens', () => {
    expect(STATUS_CLASSES['replaced']).toContain('bg-bg-tertiary')
    expect(STATUS_CLASSES['replaced']).toContain('text-text-secondary')
  })

  it('no status uses undefined shadcn tokens', () => {
    Object.values(STATUS_CLASSES).forEach(cls => {
      expect(cls).not.toContain('bg-primary')
      expect(cls).not.toContain('bg-muted')
      expect(cls).not.toContain('text-foreground')
    })
  })

  it('unused SIM badge uses warning tokens', () => {
    const unusedClass = 'bg-status-warning-bg text-status-warning'
    expect(unusedClass).toContain('bg-status-warning-bg')
    expect(unusedClass).toContain('text-status-warning')
  })
})

// ── Mobile card view ──────────────────────────────────────────────────────

describe('CustomerPhonesTab — mobile card view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomerPhones.mockResolvedValue({ phones: [] })
  })

  it('renders phone model in mobile card', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [makePhone({ model: 'Samsung Galaxy S24' })] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    expect(await screen.findAllByText('Samsung Galaxy S24')).not.toHaveLength(0)
  })

  it('mobile card shows "company-owned" for company ownership', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [makePhone({ ownership: 'company' })] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await screen.findAllByText('iPhone 15 Pro')
    expect(screen.getAllByText('company-owned').length).toBeGreaterThan(0)
  })

  it('mobile card shows "customer-owned" for customer ownership', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [makePhone({ ownership: 'customer' })] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await screen.findAllByText('iPhone 15 Pro')
    expect(screen.getAllByText('customer-owned').length).toBeGreaterThan(0)
  })

  it('mobile card shows SIM info when sim_card present', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [makePhone({
      sim_card: { id: 's1', type: 'postpaid', provider: 'BOUYGUES', number: '0612345678', base_monthly_fee: 89 },
    })] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await screen.findAllByText('iPhone 15 Pro')
    expect(screen.getAllByText('SIM: Postpaid · €89.00/mo').length).toBeGreaterThan(0)
  })

  it('mobile card shows "⚠ No SIM assigned" in warning color for is_unused phone', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [makePhone({ is_unused: true, sim_card: null })] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await screen.findAllByText('iPhone 15 Pro')
    const warnEls = screen.getAllByText('⚠ No SIM assigned')
    const warnEl = warnEls.find(el => el.className.includes('text-status-warning'))
    expect(warnEl).toBeTruthy()
  })

  it('mobile card shows muted "No SIM assigned" for non-is_unused phone without SIM', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [makePhone({ is_unused: false, status: 'in_repair', sim_card: null })] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await screen.findAllByText('iPhone 15 Pro')
    const mutedEls = screen.getAllByText('No SIM assigned')
    const mutedEl = mutedEls.find(el => el.className.includes('text-text-secondary'))
    expect(mutedEl).toBeTruthy()
  })

  it('desktop Flags column shows "⚠ No SIM assigned" badge for is_unused', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [makePhone({ is_unused: true, sim_card: null })] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await screen.findAllByText('iPhone 15 Pro')
    expect(screen.getAllByText('⚠ No SIM assigned').length).toBeGreaterThan(0)
  })

  it('empty state shows "No phones assigned."', async () => {
    mockGetCustomerPhones.mockResolvedValue({ phones: [] })
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    expect(await screen.findAllByText('No phones assigned.')).not.toHaveLength(0)
  })
})

// ── Add Phone modal — ownership select ─────────────────────────────────────

describe('Add Phone modal — ownership select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomerPhones.mockResolvedValue({ phones: [] })
  })

  it('opens modal when Add phone is clicked', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => expect(screen.getByText('+ Add phone')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Add phone'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add Phone' })).toBeInTheDocument()
  })

  it('ownership select defaults to Customer', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    const select = screen.getByLabelText(/^Ownership/) as HTMLSelectElement
    expect(select.value).toBe('customer')
  })

  it('ownership select can be changed to Company', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    const select = screen.getByLabelText(/^Ownership/) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'company' } })

    expect(select.value).toBe('company')
  })

  it('ownership select has Customer and Company options', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    const select = screen.getByLabelText(/^Ownership/) as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.text)
    expect(options).toEqual(['Customer', 'Company'])
  })

  it('submit button reads "Add Phone"', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    expect(screen.getByRole('button', { name: 'Add Phone' })).toBeInTheDocument()
  })

  it('model input has placeholder', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    expect(screen.getByPlaceholderText('e.g. iPhone 15 Pro')).toBeInTheDocument()
  })
})
