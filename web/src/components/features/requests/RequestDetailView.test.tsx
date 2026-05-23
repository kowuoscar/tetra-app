import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequestDetailView } from './RequestDetailView'
import type { RequestDetail } from '@/types'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockIsAdmin = vi.fn(() => true)
vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAdmin: () => boolean; isCompany: () => boolean }) => unknown) =>
    selector({ isAdmin: mockIsAdmin, isCompany: () => false }),
}))

const mockGetRequest = vi.fn()
vi.mock('@/lib/data/requests', () => ({
  getRequest: (...args: unknown[]) => mockGetRequest(...args),
  updateRequest: vi.fn().mockResolvedValue({}),
  addPart: vi.fn().mockResolvedValue({ id: 'p1', description: 'test', cost: 10 }),
  deletePart: vi.fn().mockResolvedValue({}),
  uploadAttachment: vi.fn().mockResolvedValue({}),
  downloadAttachment: vi.fn().mockResolvedValue(undefined),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<RequestDetail> = {}): RequestDetail {
  return {
    id: 'r1',
    customer_id: 'c1',
    customer_name: 'TechCorp ME',
    type: 'phone_repair',
    status: 'in_progress',
    author: 'company',
    fee: null,
    notes: null,
    phone_id: null,
    sim_card_id: null,
    parts: [],
    attachments: [],
    time_spent_minutes: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    done_at: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Layout: responsive grid ────────────────────────────────────────────────

describe('RequestDetailView — responsive grid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
    mockGetRequest.mockResolvedValue(makeReq())
  })

  it('two-column grid has grid-cols-1 (mobile base)', async () => {
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findByText('Phone repair')
    const grids = document.querySelectorAll('.grid')
    const twoColGrid = Array.from(grids).find(el =>
      el.className.includes('grid-cols-1') && el.className.includes('sm:grid-cols-')
    )
    expect(twoColGrid).toBeTruthy()
  })

  it('two-column grid has no inline style gridTemplateColumns', async () => {
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findByText('Phone repair')
    const grids = document.querySelectorAll('.grid')
    const inlineStyleGrid = Array.from(grids).find(el =>
      (el as HTMLElement).style.gridTemplateColumns !== ''
    )
    expect(inlineStyleGrid).toBeFalsy()
  })
})

// ── Parts card title — responsive ─────────────────────────────────────────

describe('RequestDetailView — parts card title', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
    mockGetRequest.mockResolvedValue(makeReq())
  })

  it('renders "Parts & materials" span (desktop label)', async () => {
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findByText('Phone repair')
    expect(screen.getByText('Parts & materials')).toBeInTheDocument()
  })

  it('"Parts & materials" span has hidden sm:inline classes', async () => {
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findByText('Phone repair')
    const el = screen.getByText('Parts & materials')
    expect(el.className).toContain('hidden')
    expect(el.className).toContain('sm:inline')
  })

  it('renders "Parts" span (mobile label)', async () => {
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findByText('Phone repair')
    expect(screen.getByText('Parts')).toBeInTheDocument()
  })

  it('"Parts" span has sm:hidden class', async () => {
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findByText('Phone repair')
    const el = screen.getByText('Parts')
    expect(el.className).toContain('sm:hidden')
  })
})

// ── Header card ────────────────────────────────────────────────────────────

describe('RequestDetailView — header card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
  })

  it('shows request type name', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ type: 'phone_repair' }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    expect(await screen.findAllByText('Phone repair')).not.toHaveLength(0)
  })

  it('shows status badge', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ status: 'submitted' }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0)
  })

  it('shows customer name', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ customer_name: 'TechCorp ME' }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getAllByText('TechCorp ME').length).toBeGreaterThan(0)
  })

  it('shows author', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ author: 'company' }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getAllByText(/by company/i).length).toBeGreaterThan(0)
  })
})

// ── Status change controls ─────────────────────────────────────────────────

describe('RequestDetailView — status change controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
  })

  it('shows "Save changes" button when status is not done', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ status: 'in_progress' }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('hides "Save changes" button when status is done', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ status: 'done', done_at: new Date().toISOString() }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })
})

// ── Admin-only: fee section ────────────────────────────────────────────────

describe('RequestDetailView — fee section (admin-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Request fee section for admin', async () => {
    mockIsAdmin.mockReturnValue(true)
    mockGetRequest.mockResolvedValue(makeReq())
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByText('Request fee')).toBeInTheDocument()
  })

  it('hides Request fee section for non-admin', async () => {
    mockIsAdmin.mockReturnValue(false)
    mockGetRequest.mockResolvedValue(makeReq())
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.queryByText('Request fee')).not.toBeInTheDocument()
  })
})

// ── Parts list ─────────────────────────────────────────────────────────────

describe('RequestDetailView — parts list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
  })

  it('shows "No parts added yet." when empty', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ parts: [] }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByText('No parts added yet.')).toBeInTheDocument()
  })

  it('renders part description and cost', async () => {
    mockGetRequest.mockResolvedValue(makeReq({
      parts: [{ id: 'p1', description: 'Screen replacement', cost: 85 }],
    }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByText('Screen replacement')).toBeInTheDocument()
    expect(screen.getAllByText('€85.00').length).toBeGreaterThan(0)
  })
})

// ── Attachments ────────────────────────────────────────────────────────────

describe('RequestDetailView — attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
  })

  it('shows Attachments section', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ attachments: [] }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByText('Attachments')).toBeInTheDocument()
  })

  it('mobile title shows count when attachments present', async () => {
    mockGetRequest.mockResolvedValue(makeReq({
      attachments: [
        { id: 'a1', uploaded_by_user_id: 'u1', created_at: new Date().toISOString() },
        { id: 'a2', uploaded_by_user_id: 'u1', created_at: new Date().toISOString() },
      ],
    }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    const allSmHiddenSpans = document.querySelectorAll('span.sm\\:hidden')
    const countSpan = Array.from(allSmHiddenSpans).find(el => el.textContent?.includes('('))
    expect(countSpan?.textContent).toContain('(2)')
  })

  it('desktop title has no count span when attachments present', async () => {
    mockGetRequest.mockResolvedValue(makeReq({
      attachments: [
        { id: 'a1', uploaded_by_user_id: 'u1', created_at: new Date().toISOString() },
      ],
    }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByText('Attachments')).toBeInTheDocument()
  })

  it('shows "+ Upload photo" button', async () => {
    mockGetRequest.mockResolvedValue(makeReq())
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByRole('button', { name: '+ Upload photo' })).toBeInTheDocument()
  })

  it('mobile "+ Add" tile is present', async () => {
    mockGetRequest.mockResolvedValue(makeReq())
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument()
  })
})

// ── Header metadata ────────────────────────────────────────────────────────

describe('RequestDetailView — header metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
  })

  it('desktop metadata shows author + relative date combined', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ author: 'company' }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    const desktopMeta = document.querySelector('.hidden.sm\\:flex')
    expect(desktopMeta?.textContent).toMatch(/by Company · \d+ days? ago/)
  })

  it('desktop metadata has no dot-separator spans', async () => {
    mockGetRequest.mockResolvedValue(makeReq())
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    const desktopMeta = document.querySelector('.hidden.sm\\:flex')
    const dotSpans = Array.from(desktopMeta?.querySelectorAll('span') ?? []).filter(
      el => el.textContent === '·'
    )
    expect(dotSpans).toHaveLength(0)
  })

  it('mobile detail card shows customer, author and relative date', async () => {
    mockGetRequest.mockResolvedValue(makeReq({ customer_name: 'TechCorp ME', author: 'company' }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    const mobileCard = document.querySelector('.sm\\:hidden.bg-surface')
    expect(mobileCard?.textContent).toMatch(/TechCorp ME/)
    expect(mobileCard?.textContent).toMatch(/Company/)
    expect(mobileCard?.textContent).toMatch(/.+ ago/)
  })

  it('relative date shows "X days ago" format', async () => {
    mockGetRequest.mockResolvedValue(makeReq({
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getAllByText(/3 days ago/).length).toBeGreaterThan(0)
  })
})

// ── Time spent (admin-only) ────────────────────────────────────────────────

describe('RequestDetailView — time spent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows formatted time_spent for admin when done', async () => {
    mockIsAdmin.mockReturnValue(true)
    mockGetRequest.mockResolvedValue(makeReq({
      status: 'done',
      done_at: new Date().toISOString(),
      time_spent_minutes: 4582,
    }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.getByText(/Time:/)).toBeInTheDocument()
  })

  it('hides time_spent for non-admin', async () => {
    mockIsAdmin.mockReturnValue(false)
    mockGetRequest.mockResolvedValue(makeReq({
      status: 'done',
      done_at: new Date().toISOString(),
      time_spent_minutes: 4582,
    }))
    render(<RequestDetailView requestId="r1" />, { wrapper })
    await screen.findAllByText('Phone repair')
    expect(screen.queryByText(/Time:/)).not.toBeInTheDocument()
  })
})
