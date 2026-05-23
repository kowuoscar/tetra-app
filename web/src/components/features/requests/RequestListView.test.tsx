import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequestListView } from './RequestListView'
import type { RequestSummary, PagedResponse } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean; isCompany: () => boolean }) => unknown) =>
    selector({ isAdmin: () => true, isCompany: () => false }),
}))

const mockGetRequests = vi.fn()
vi.mock('@/lib/data/requests', () => ({
  getRequests: (...args: unknown[]) => mockGetRequests(...args),
}))

const mockGetCustomers = vi.fn().mockResolvedValue({ content: [], total_elements: 0, total_pages: 0, page: 0, size: 200 })
vi.mock('@/lib/data/customers', () => ({
  getCustomers: (...args: unknown[]) => mockGetCustomers(...args),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<RequestSummary> = {}): RequestSummary {
  return {
    id: 'r1',
    customer_id: 'c1',
    customer_name: 'TechCorp ME',
    type: 'phone_repair',
    status: 'in_progress',
    author: 'company',
    fee: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    done_at: null,
    ...overrides,
  }
}

function makePage(items: RequestSummary[]): PagedResponse<RequestSummary> {
  return { content: items, total_elements: items.length, total_pages: 1, page: 0, size: 20 }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Desktop table design tokens ────────────────────────────────────────────

describe('RequestListView — desktop table design tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRequests.mockResolvedValue(makePage([]))
  })

  it('desktop table container has bg-surface', async () => {
    render(<RequestListView />, { wrapper })
    await waitFor(() => expect(mockGetRequests).toHaveBeenCalled())
    const tables = document.querySelectorAll('table')
    const container = tables[0]?.closest('div')
    expect(container?.className).toContain('bg-surface')
  })

  it('desktop table headers use uppercase + tracking-wider', async () => {
    render(<RequestListView />, { wrapper })
    await waitFor(() => expect(mockGetRequests).toHaveBeenCalled())
    const typeHeader = screen.getAllByText('Type')[0]
    expect(typeHeader.className).toContain('uppercase')
    expect(typeHeader.className).toContain('tracking-wider')
  })

  it('type select has hidden class for mobile', async () => {
    render(<RequestListView />, { wrapper })
    await waitFor(() => expect(mockGetRequests).toHaveBeenCalled())
    const selects = document.querySelectorAll('select')
    const typeSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.text === 'All types')
    )
    expect(typeSelect?.className).toContain('hidden')
  })

  it('customer select has hidden class for mobile', async () => {
    render(<RequestListView />, { wrapper })
    await waitFor(() => expect(mockGetRequests).toHaveBeenCalled())
    const selects = document.querySelectorAll('select')
    const custSelect = Array.from(selects).find(s =>
      Array.from(s.options).some(o => o.text === 'All customers')
    )
    expect(custSelect?.className).toContain('hidden')
  })
})

// ── Mobile card view ───────────────────────────────────────────────────────

describe('RequestListView — mobile card view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRequests.mockResolvedValue(makePage([]))
  })

  it('renders request type in mobile card', async () => {
    mockGetRequests.mockResolvedValue(makePage([makeReq({ type: 'phone_repair' })]))
    render(<RequestListView />, { wrapper })
    // wait for the data link (not the <option> element)
    expect(await screen.findAllByRole('link', { name: 'Phone repair' })).not.toHaveLength(0)
  })

  it('mobile card shows customer and author in subtitle', async () => {
    mockGetRequests.mockResolvedValue(makePage([makeReq({ customer_name: 'TechCorp ME', author: 'company' })]))
    render(<RequestListView />, { wrapper })
    await screen.findAllByRole('link', { name: 'Phone repair' })
    // mobile card <p> renders: "TechCorp ME · by company · Xd ago"
    const pEls = Array.from(document.querySelectorAll('p'))
    const match = pEls.find(el =>
      (el.textContent ?? '').includes('TechCorp ME') && (el.textContent ?? '').includes('by company')
    )
    expect(match).toBeTruthy()
  })

  it('mobile card shows status badge', async () => {
    mockGetRequests.mockResolvedValue(makePage([makeReq({ status: 'in_progress' })]))
    render(<RequestListView />, { wrapper })
    await screen.findAllByRole('link', { name: 'Phone repair' })
    expect(screen.getAllByText('In progress').length).toBeGreaterThan(0)
  })

  it('empty unfiltered shows "No requests yet"', async () => {
    mockGetRequests.mockResolvedValue(makePage([]))
    render(<RequestListView />, { wrapper })
    expect(await screen.findAllByText('No requests yet')).not.toHaveLength(0)
  })

  it('empty unfiltered shows "New request" button', async () => {
    mockGetRequests.mockResolvedValue(makePage([]))
    render(<RequestListView />, { wrapper })
    await screen.findAllByText('No requests yet')
    expect(screen.getAllByRole('button', { name: 'New request' }).length).toBeGreaterThan(0)
  })

  it('empty filtered shows "No requests" without New request button', async () => {
    mockGetRequests.mockResolvedValue(makePage([]))
    render(<RequestListView />, { wrapper })
    await waitFor(() => screen.getByText('All'))
    fireEvent.click(screen.getByText('Submitted'))
    await screen.findAllByText('No requests')
    expect(screen.queryByRole('button', { name: 'New request' })).not.toBeInTheDocument()
  })
})

// ── Status pills ───────────────────────────────────────────────────────────

describe('RequestListView — status pills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRequests.mockResolvedValue(makePage([]))
  })

  it('renders All / Submitted / In progress / Done pills', async () => {
    render(<RequestListView />, { wrapper })
    await waitFor(() => screen.getByText('All'))
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('clicking a pill triggers re-fetch with that status', async () => {
    render(<RequestListView />, { wrapper })
    await waitFor(() => screen.getByText('Submitted'))
    fireEvent.click(screen.getByText('Submitted'))
    await waitFor(() => {
      const calls = mockGetRequests.mock.calls
      expect(calls.some((c: unknown[]) => (c[0] as { status?: string })?.status === 'submitted')).toBe(true)
    })
  })
})
