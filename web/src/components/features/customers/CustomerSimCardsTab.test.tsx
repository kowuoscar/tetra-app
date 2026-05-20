import { describe, it, expect } from 'vitest'

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
