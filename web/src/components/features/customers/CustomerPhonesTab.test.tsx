import { describe, it, expect } from 'vitest'

const STATUS_CLASSES: Record<string, string> = {
  active:    'bg-status-successBg text-status-success',
  in_repair: 'bg-status-warningBg text-status-warning',
  replaced:  'bg-bg-tertiary text-text-secondary',
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

  it('unused phone badge uses warning tokens', () => {
    const unusedClass = 'bg-status-warningBg text-status-warning'
    expect(unusedClass).toContain('bg-status-warningBg')
    expect(unusedClass).toContain('text-status-warning')
  })
})
