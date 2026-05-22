import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('default variant uses brand-primary background', () => {
    render(<Button>Click me</Button>)
    const el = screen.getByRole('button', { name: 'Click me' })
    expect(el.className).toContain('bg-brand-primary')
    expect(el.className).toContain('text-white')
    expect(el.className).toContain('hover:bg-brand-hover')
  })

  it('outline variant uses border and surface background', () => {
    render(<Button variant="outline">Outline</Button>)
    const el = screen.getByRole('button', { name: 'Outline' })
    expect(el.className).toContain('border-border')
    expect(el.className).toContain('bg-surface')
    expect(el.className).toContain('hover:bg-bg-secondary')
  })

  it('ghost variant uses tertiary hover', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const el = screen.getByRole('button', { name: 'Ghost' })
    expect(el.className).toContain('hover:bg-bg-tertiary')
    expect(el.className).toContain('hover:text-text-primary')
  })

  it('destructive variant uses error status tokens', () => {
    render(<Button variant="destructive">Delete</Button>)
    const el = screen.getByRole('button', { name: 'Delete' })
    expect(el.className).toContain('bg-status-error-bg')
    expect(el.className).toContain('text-status-error')
  })

  it('uses brand-primary focus ring, not shadcn ring', () => {
    render(<Button>Focus</Button>)
    const el = screen.getByRole('button', { name: 'Focus' })
    expect(el.className).toContain('focus-visible:border-brand-primary')
    expect(el.className).toContain('focus-visible:ring-brand-primary/30')
    expect(el.className).not.toContain('focus-visible:ring-ring')
  })

  it('does not use undefined shadcn tokens', () => {
    render(<Button>Test</Button>)
    const el = screen.getByRole('button', { name: 'Test' })
    expect(el.className).not.toContain('bg-primary')
    expect(el.className).not.toContain('text-primary-foreground')
    expect(el.className).not.toContain('bg-background')
    expect(el.className).not.toContain('hover:bg-muted')
  })

  it('disabled state renders correctly', () => {
    render(<Button disabled>Disabled</Button>)
    const el = screen.getByRole('button', { name: 'Disabled' })
    expect(el).toBeDisabled()
    expect(el.className).toContain('disabled:opacity-50')
  })
})
