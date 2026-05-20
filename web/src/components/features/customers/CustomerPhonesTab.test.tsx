import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerPhonesTab } from './CustomerPhonesTab'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean }) => unknown) =>
    selector({ isAdmin: () => true }),
}))

vi.mock('@/lib/data/customers', () => ({
  getCustomerPhones: vi.fn().mockResolvedValue({ phones: [] }),
  createPhone: vi.fn().mockResolvedValue({ id: 'p1', model: 'Test', ownership: 'customer', status: 'active', customer_id: 'c1', sim_card: null, is_unused: false, created_at: '' }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Status badge design tokens (original tests) ────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  active:     'bg-status-successBg text-status-success',
  in_repair:  'bg-status-warningBg text-status-warning',
  replaced:   'bg-bg-tertiary text-text-secondary',
}

describe('CustomerPhonesTab — status badge design tokens', () => {
  it('active phone uses success status tokens', () => {
    expect(STATUS_CLASSES['active']).toContain('bg-status-successBg')
    expect(STATUS_CLASSES['active']).toContain('text-status-success')
  })

  it('in_repair phone uses warning status tokens', () => {
    expect(STATUS_CLASSES['in_repair']).toContain('bg-status-warningBg')
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
    const unusedClass = 'bg-status-warningBg text-status-warning'
    expect(unusedClass).toContain('bg-status-warningBg')
    expect(unusedClass).toContain('text-status-warning')
  })
})

// ── Add Phone modal — ownership select ─────────────────────────────────────

describe('Add Phone modal — ownership select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens modal when Add phone is clicked', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => expect(screen.getByText('+ Add phone')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Add phone'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Add Phone')).toBeInTheDocument()
  })

  it('ownership select defaults to Customer', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    const select = screen.getByLabelText('Ownership') as HTMLSelectElement
    expect(select.value).toBe('customer')
  })

  it('ownership select can be changed to Company', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    const select = screen.getByLabelText('Ownership') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'company' } })

    expect(select.value).toBe('company')
  })

  it('ownership select has Customer and Company options', async () => {
    render(<CustomerPhonesTab customerId="c1" />, { wrapper })
    await waitFor(() => screen.getByText('+ Add phone'))
    fireEvent.click(screen.getByText('+ Add phone'))

    const select = screen.getByLabelText('Ownership') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.text)
    expect(options).toEqual(['Customer', 'Company'])
  })
})
