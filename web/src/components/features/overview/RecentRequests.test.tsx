import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecentRequests } from './RecentRequests'
import type { PagedResponse, RequestSummary } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockGetRequests = vi.fn()
vi.mock('@/lib/data/requests', () => ({
  getRequests: (...args: unknown[]) => mockGetRequests(...args),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeRequest(overrides: Partial<RequestSummary> = {}): RequestSummary {
  return {
    id: 'r1',
    customer_id: 'c1',
    customer_name: 'TechCorp ME',
    type: 'phone_repair',
    status: 'submitted',
    author: 'company',
    fee: null,
    created_at: new Date().toISOString(),
    done_at: null,
    ...overrides,
  }
}

function pagedOf(items: RequestSummary[]): PagedResponse<RequestSummary> {
  return { content: items, total_elements: items.length, total_pages: 1, page: 0, size: 5 }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RecentRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders card title', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([]))
    render(<RecentRequests openCount={0} />, { wrapper })
    expect(screen.getByText('Recent requests')).toBeInTheDocument()
  })

  it('shows open badge when openCount > 0', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([]))
    render(<RecentRequests openCount={7} />, { wrapper })
    expect(screen.getByText('7 open')).toBeInTheDocument()
  })

  it('hides open badge when openCount is 0', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([]))
    render(<RecentRequests openCount={0} />, { wrapper })
    expect(screen.queryByText(/open/)).not.toBeInTheDocument()
  })

  it('renders table column headers', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([]))
    render(<RecentRequests openCount={0} />, { wrapper })
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders empty state when no requests', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([]))
    render(<RecentRequests openCount={0} />, { wrapper })
    expect(await screen.findByText('No requests yet.')).toBeInTheDocument()
  })

  it('renders request type and customer name in table row', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([
      makeRequest({ type: 'phone_repair', customer_name: 'TechCorp ME', status: 'in_progress' }),
    ]))
    render(<RecentRequests openCount={1} />, { wrapper })
    expect(await screen.findByText('Phone repair')).toBeInTheDocument()
    expect(screen.getByText('TechCorp ME')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('renders multiple request rows', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([
      makeRequest({ id: 'r1', customer_name: 'Alpha Corp', type: 'new_sim', status: 'submitted' }),
      makeRequest({ id: 'r2', customer_name: 'Beta LLC',  type: 'onboarding', status: 'done' }),
    ]))
    render(<RecentRequests openCount={1} />, { wrapper })
    expect(await screen.findByText('Alpha Corp')).toBeInTheDocument()
    expect(screen.getByText('Beta LLC')).toBeInTheDocument()
    expect(screen.getByText('New SIM')).toBeInTheDocument()
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })

  it('maps all request type labels correctly', async () => {
    const types: RequestSummary['type'][] = [
      'phone_repair', 'phone_replacement', 'sim_topup', 'new_sim', 'manual_support', 'onboarding',
    ]
    const expected = [
      'Phone repair', 'Phone replacement', 'SIM top-up', 'New SIM', 'Manual support', 'Onboarding',
    ]
    mockGetRequests.mockResolvedValue(pagedOf(
      types.map((type, i) => makeRequest({ id: `r${i}`, type }))
    ))
    render(<RecentRequests openCount={0} />, { wrapper })
    for (const label of expected) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it('does not render relative time column', async () => {
    mockGetRequests.mockResolvedValue(pagedOf([
      makeRequest({ created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() }),
    ]))
    render(<RecentRequests openCount={0} />, { wrapper })
    await screen.findByText('Phone repair')
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument()
  })
})
