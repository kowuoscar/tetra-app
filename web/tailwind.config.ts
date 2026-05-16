import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   'var(--color-brand-primary)',
          hover:     'var(--color-brand-hover)',
          secondary: 'var(--color-brand-secondary)',
        },
        bg: {
          primary:   'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          tertiary:  'var(--color-background-tertiary)',
        },
        surface:  'var(--color-surface)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          disabled:  'var(--color-text-disabled)',
        },
        status: {
          success:    'var(--color-status-success)',
          successBg:  'var(--color-status-success-bg)',
          warning:    'var(--color-status-warning)',
          warningBg:  'var(--color-status-warning-bg)',
          error:      'var(--color-status-error)',
          errorBg:    'var(--color-status-error-bg)',
          info:       'var(--color-status-info)',
          infoBg:     'var(--color-status-info-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'Source Code Pro', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs:  ['0.75rem',  { lineHeight: '1.25' }],
        sm:  ['0.875rem', { lineHeight: '1.5'  }],
        md:  ['1rem',     { lineHeight: '1.5'  }],
        lg:  ['1.125rem', { lineHeight: '1.5'  }],
        xl:  ['1.25rem',  { lineHeight: '1.25' }],
        '2xl': ['1.5rem',   { lineHeight: '1.25' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem',  { lineHeight: '1.25' }],
      },
      spacing: {
        '0':  '0px',
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '8':  '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        none: '0px',
        sm:   '4px',
        md:   '6px',
        lg:   '8px',
        xl:   '12px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        sm:   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md:   '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        lg:   '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        xl:   '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
      },
      transitionDuration: {
        fast:   '100ms',
        normal: '200ms',
        slow:   '300ms',
      },
      transitionTimingFunction: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in:      'cubic-bezier(0.4, 0, 1, 1)',
        out:     'cubic-bezier(0, 0, 0.2, 1)',
      },
      screens: {
        sm:  '640px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl': '1536px',
      },
      zIndex: {
        base:     '0',
        raised:   '10',
        dropdown: '100',
        sticky:   '200',
        overlay:  '300',
        modal:    '400',
        toast:    '500',
      },
    },
  },
  plugins: [],
}

export default config
