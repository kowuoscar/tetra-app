import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './input'

describe('Input', () => {
  it('renders with design system border token', () => {
    render(<Input placeholder="Type here" />)
    const el = screen.getByPlaceholderText('Type here')
    expect(el.className).toContain('border-border')
    expect(el.className).not.toContain('border-input')
  })

  it('uses brand-primary focus ring', () => {
    render(<Input placeholder="Focus" />)
    const el = screen.getByPlaceholderText('Focus')
    expect(el.className).toContain('focus-visible:border-brand-primary')
    expect(el.className).toContain('focus-visible:ring-brand-primary/30')
    expect(el.className).not.toContain('focus-visible:ring-ring')
  })

  it('uses text-disabled for placeholder', () => {
    render(<Input placeholder="Placeholder" />)
    const el = screen.getByPlaceholderText('Placeholder')
    expect(el.className).toContain('placeholder:text-text-disabled')
    expect(el.className).not.toContain('placeholder:text-muted-foreground')
  })

  it('uses bg-tertiary when disabled', () => {
    render(<Input placeholder="Disabled" disabled />)
    const el = screen.getByPlaceholderText('Disabled')
    expect(el).toBeDisabled()
    expect(el.className).toContain('disabled:bg-bg-tertiary')
  })

  it('uses error status tokens for invalid state', () => {
    render(<Input placeholder="Invalid" aria-invalid="true" />)
    const el = screen.getByPlaceholderText('Invalid')
    expect(el.className).toContain('aria-invalid:border-status-error')
    expect(el.className).toContain('aria-invalid:ring-status-error/20')
    expect(el.className).not.toContain('aria-invalid:border-destructive')
  })
})
