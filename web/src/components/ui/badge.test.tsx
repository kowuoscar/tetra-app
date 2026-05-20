import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge', () => {
  it('default variant uses brand-primary background', () => {
    render(<Badge>Test</Badge>)
    const el = screen.getByText('Test')
    expect(el.className).toContain('bg-brand-primary')
    expect(el.className).toContain('text-white')
  })

  it('secondary variant uses tertiary background and secondary text', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const el = screen.getByText('Secondary')
    expect(el.className).toContain('bg-bg-tertiary')
    expect(el.className).toContain('text-text-secondary')
  })

  it('destructive variant uses error status tokens', () => {
    render(<Badge variant="destructive">Error</Badge>)
    const el = screen.getByText('Error')
    expect(el.className).toContain('bg-status-errorBg')
    expect(el.className).toContain('text-status-error')
  })

  it('outline variant uses border and primary text', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const el = screen.getByText('Outline')
    expect(el.className).toContain('border-border')
    expect(el.className).toContain('text-text-primary')
  })

  it('accepts className override for status colors', () => {
    render(
      <Badge className="bg-status-successBg text-status-success">Active</Badge>
    )
    const el = screen.getByText('Active')
    expect(el.className).toContain('bg-status-successBg')
    expect(el.className).toContain('text-status-success')
  })

  it('accepts className override for warning status', () => {
    render(
      <Badge className="bg-status-warningBg text-status-warning">In Repair</Badge>
    )
    const el = screen.getByText('In Repair')
    expect(el.className).toContain('bg-status-warningBg')
    expect(el.className).toContain('text-status-warning')
  })

  it('does not use undefined shadcn tokens', () => {
    render(<Badge>Test</Badge>)
    const el = screen.getByText('Test')
    expect(el.className).not.toContain('bg-primary')
    expect(el.className).not.toContain('text-primary-foreground')
    expect(el.className).not.toContain('bg-secondary')
    expect(el.className).not.toContain('bg-destructive')
  })
})
