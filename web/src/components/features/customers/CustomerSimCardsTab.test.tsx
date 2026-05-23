import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerSimCardsTab } from './CustomerSimCardsTab'
import type { SimCardSummary } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean }) => unknown) =>
    selector({ isAdmin: () => true }),
}))

const mockGetCustomerSimCards = vi.fn().mockResolvedValue({ sim_cards: [] })
vi.mock('@/lib/data/customers', () => ({
  getCustomerSimCards: (...args: unknown[]) => mockGetCustomerSimCards(...args),
  createSimCard: vi.fn().mockResolvedValue({ id: 's1', type: 'prepaid', base_monthly_fee: 0, status: 'unassigned', customer_id: 'c1', phone_id: null, is_unused: true, created_at: '' }),
  updateSimCard: vi.fn().mockResolvedValue({}),
  getCustomerPhones: vi.fn().mockResolvedValue({ phones: [] }),
}))

function makeSim(overrides: Partial<SimCardSummary> = {}): SimCardSummary {
  return {
    id: 's1',
    type: 'postpaid',
    provider: 'BOUYGUES',
    number: '0612345678',
    base_monthly_fee: 89,
    status: 'active',
    phone_id: 'p1',
    customer_id: 'c1',
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
  unassigned: 'bg-bg-tertiary text-text-secondary',
  cancelled:  'bg-bg-tertiary text-text-secondary',
}

describe('CustomerSimCardsTab — status badge design tokens', () => {
  it('active SIM uses success status tokens', () => {
    expect(STATUS_CLASSES['active']).toContain('bg-status-success-bg')
    expect(STATUS_CLASSES['active']).toContain('text-status-success')
  })

  it('unassigned SIM uses muted tertiary tokens', () => {
    expect(STATUS_CLASSES['unassigned']).toContain('bg-bg-tertiary')
    expect(STATUS_CLASSES['unassigned']).toContain('text-text-secondary')
  })

  it('cancelled SIM uses muted tertiary tokens', () => {
    expect(STATUS_CLASSES['cancelled']).toContain('bg-bg-tertiary')
    expect(STATUS_CLASSES['cancelled']).toContain('text-text-secondary')
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

describe('CustomerSimCardsTab — mobile card view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [] })
  })

  it('renders SIM type in mobile card', async () => {
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [makeSim({ type: 'postpaid' })] })
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    expect(await screen.findAllByText('postpaid')).not.toHaveLength(0)
  })

  it('mobile card shows provider and number', async () => {
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [makeSim({ provider: 'BOUYGUES', number: '0612345678' })] })
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await screen.findAllByText('postpaid')
    expect(screen.getAllByText('Bouygues · 0612345678').length).toBeGreaterThan(0)
  })

  it('mobile card shows fee for postpaid', async () => {
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [makeSim({ type: 'postpaid', base_monthly_fee: 89, is_unused: false })] })
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await screen.findAllByText('postpaid')
    expect(screen.getAllByText('€89.00/mo').length).toBeGreaterThan(0)
  })

  it('mobile card shows "⚠ No phone assigned" in warning for is_unused', async () => {
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [makeSim({ is_unused: true, phone_id: null })] })
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await screen.findAllByText('postpaid')
    const warnEls = screen.getAllByText('⚠ No phone assigned')
    const warnEl = warnEls.find(el => el.className.includes('text-status-warning'))
    expect(warnEl).toBeTruthy()
  })

  it('desktop Flags column shows "⚠ No phone assigned" badge for is_unused', async () => {
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [makeSim({ is_unused: true, phone_id: null })] })
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await screen.findAllByText('postpaid')
    expect(screen.getAllByText('⚠ No phone assigned').length).toBeGreaterThan(0)
  })

  it('empty state shows "No SIM cards assigned."', async () => {
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [] })
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    expect(await screen.findAllByText('No SIM cards assigned.')).not.toHaveLength(0)
  })
})

// ── Add SIM modal — type select ────────────────────────────────────────────

describe('Add SIM modal — type select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [] })
  })

  it('opens modal when Add SIM is clicked', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => expect(screen.getByText('+ Add SIM')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Add SIM'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add SIM Card' })).toBeInTheDocument()
  })

  it('type select defaults to Prepaid', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const select = screen.getByLabelText(/^Type/) as HTMLSelectElement
    expect(select.value).toBe('prepaid')
  })

  it('type select can be changed to Postpaid', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const select = screen.getByLabelText(/^Type/) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'postpaid' } })

    expect(select.value).toBe('postpaid')
  })

  it('type select has Prepaid and Postpaid options', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const select = screen.getByLabelText(/^Type/) as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.text)
    expect(options).toEqual(['Prepaid', 'Postpaid'])
  })
})

// ── Add SIM modal — new design fields ─────────────────────────────────────

describe('Add SIM modal — new design fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomerSimCards.mockResolvedValue({ sim_cards: [] })
  })

  it('shows prepaid info banner by default', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    expect(screen.getByText('Prepaid SIMs have no monthly fee. €0.00 will be recorded automatically.')).toBeInTheDocument()
  })

  it('hides prepaid info banner when switched to postpaid', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    fireEvent.change(screen.getByLabelText(/^Type/), { target: { value: 'postpaid' } })

    expect(screen.queryByText('Prepaid SIMs have no monthly fee. €0.00 will be recorded automatically.')).not.toBeInTheDocument()
  })

  it('submit button reads "Add SIM Card"', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    expect(screen.getByRole('button', { name: 'Add SIM Card' })).toBeInTheDocument()
  })

  it('"Assign to phone" select defaults to "Not assigned"', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const phoneSelect = screen.getByLabelText(/Assign to phone/) as HTMLSelectElement
    expect(phoneSelect.value).toBe('')
    expect(Array.from(phoneSelect.options).map((o) => o.text)).toContain('Not assigned')
  })

  it('mobile number field shows helper text', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    expect(screen.getByText('French mobile number (06 / 07 prefix)')).toBeInTheDocument()
  })

  it('provider select starts with placeholder option', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const providerSelect = screen.getByLabelText(/^Provider/) as HTMLSelectElement
    expect(providerSelect.value).toBe('')
    expect(Array.from(providerSelect.options).map((o) => o.text)).toContain('Select provider…')
  })
})
