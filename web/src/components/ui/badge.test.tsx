import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge, statusVariant } from './badge'

describe('StatusBadge', () => {
  it('default variant is neutral', () => {
    render(<StatusBadge>Test</StatusBadge>)
    const el = screen.getByText('Test').closest('span')!
    expect(el.className).toContain('bg-bg-tertiary')
    expect(el.className).toContain('text-text-secondary')
  })

  it('success variant applies correct tokens', () => {
    render(<StatusBadge variant="success">Active</StatusBadge>)
    const el = screen.getByText('Active').closest('span')!
    expect(el.className).toContain('bg-status-successBg')
    expect(el.className).toContain('text-status-success')
  })

  it('warning variant applies correct tokens', () => {
    render(<StatusBadge variant="warning">In Repair</StatusBadge>)
    const el = screen.getByText('In Repair').closest('span')!
    expect(el.className).toContain('bg-status-warningBg')
    expect(el.className).toContain('text-status-warning')
  })

  it('error variant applies correct tokens', () => {
    render(<StatusBadge variant="error">Error</StatusBadge>)
    const el = screen.getByText('Error').closest('span')!
    expect(el.className).toContain('bg-status-errorBg')
    expect(el.className).toContain('text-status-error')
  })

  it('brand variant applies correct tokens and no dot', () => {
    render(<StatusBadge variant="brand">SIM</StatusBadge>)
    const wrapper = screen.getByText('SIM').closest('span')!
    expect(wrapper.className).toContain('bg-brand-secondary')
    expect(wrapper.className).toContain('text-brand-primary')
    expect(wrapper.querySelectorAll('span').length).toBe(0)
  })

  it('dot is rendered by default for non-brand', () => {
    render(<StatusBadge variant="success">Active</StatusBadge>)
    const wrapper = screen.getByText('Active').closest('span')!
    const dot = wrapper.querySelector('span')
    expect(dot).not.toBeNull()
    expect(dot!.className).toContain('bg-status-success')
  })

  it('dot hidden when dot=false', () => {
    render(<StatusBadge variant="success" dot={false}>Active</StatusBadge>)
    const wrapper = screen.getByText('Active').closest('span')!
    expect(wrapper.querySelectorAll('span').length).toBe(0)
  })
})

describe('statusVariant', () => {
  it('maps known statuses', () => {
    expect(statusVariant('active')).toBe('success')
    expect(statusVariant('in_progress')).toBe('warning')
    expect(statusVariant('done')).toBe('success')
    expect(statusVariant('cancelled')).toBe('neutral')
    expect(statusVariant('unassigned')).toBe('warning')
    expect(statusVariant('in_repair')).toBe('warning')
    expect(statusVariant('draft')).toBe('neutral')
    expect(statusVariant('sent')).toBe('info')
    expect(statusVariant('paid')).toBe('success')
  })

  it('returns neutral for unknown status', () => {
    expect(statusVariant('whatever')).toBe('neutral')
  })
})
