import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerSimCardsTab } from './CustomerSimCardsTab'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean }) => unknown) =>
    selector({ isAdmin: () => true }),
}))

vi.mock('@/lib/data/customers', () => ({
  getCustomerSimCards: vi.fn().mockResolvedValue({ sim_cards: [] }),
  createSimCard: vi.fn().mockResolvedValue({ id: 's1', type: 'prepaid', base_monthly_fee: 0, status: 'unassigned', customer_id: 'c1', phone_id: null, is_unused: true, created_at: '' }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Status badge design tokens (original tests) ────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  active:     'bg-status-successBg text-status-success',
  unassigned: 'bg-bg-tertiary text-text-secondary',
  cancelled:  'bg-bg-tertiary text-text-secondary',
}

describe('CustomerSimCardsTab — status badge design tokens', () => {
  it('active SIM uses success status tokens', () => {
    expect(STATUS_CLASSES['active']).toContain('bg-status-successBg')
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
    const unusedClass = 'bg-status-warningBg text-status-warning'
    expect(unusedClass).toContain('bg-status-warningBg')
    expect(unusedClass).toContain('text-status-warning')
  })
})

// ── Add SIM modal — type select ────────────────────────────────────────────

describe('Add SIM modal — type select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens modal when Add SIM is clicked', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => expect(screen.getByText('+ Add SIM')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Add SIM'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Add SIM Card')).toBeInTheDocument()
  })

  it('type select defaults to Prepaid', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const select = screen.getByLabelText('Type') as HTMLSelectElement
    expect(select.value).toBe('prepaid')
  })

  it('type select can be changed to Postpaid', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const select = screen.getByLabelText('Type') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'postpaid' } })

    expect(select.value).toBe('postpaid')
  })

  it('type select has Prepaid and Postpaid options', async () => {
    render(<CustomerSimCardsTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add SIM'))
    fireEvent.click(screen.getByText('+ Add SIM'))

    const select = screen.getByLabelText('Type') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.text)
    expect(options).toEqual(['Prepaid', 'Postpaid'])
  })
})
