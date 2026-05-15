# Design brief

## Product personality

Tetra is a precision operations tool — it handles money, assets, and service accountability for a small team with real consequences for errors. It should feel like a tool built by people who respect the user's time: no decoration for its own sake, no ambiguity in status, no hunting for the right action. Every screen should immediately answer "what is the state of things and what can I do next." The emotional register is calm confidence — not sterile, not playful, but the quiet focus of a well-run operation.

## Aesthetic direction

Clean B2B operations dashboard. The reference points are Stripe, Linear, and Vercel — products that handle dense, structured information without feeling clinical. The foundation is a cool slate neutral base with a single deep indigo accent that carries all primary actions and active states. Information density is high but whitespace is used deliberately to group related elements and give the eye places to rest. Borders do structural work; shadows are used sparingly and only to signal elevation. Status is communicated through color-coded badges that appear throughout — request states, invoice states, phone and SIM flags — and these must be immediately readable at a glance.

## Typography

- **Display / heading font:** Inter — numerals are tabular and legible, rendering is excellent at small sizes, widely used in modern SaaS dashboards, no licensing concerns
- **Body font:** Inter — same family for a unified, tight system
- **Mono font:** system-ui monospace (`ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace`) — used only for invoice numbers, IBANs, codes
- **Type scale philosophy:** restrained 6-step scale (xs through 3xl); 4xl reserved for display only. Most UI lives at sm–lg. Heading hierarchy is established primarily through weight and color contrast, not dramatic size jumps.

## Color direction

- **Primary (indigo):** deep indigo `#4F46E5` — carries all primary CTAs, active nav states, focus rings, links. Chosen for its professional, modern SaaS character — distinct from corporate blue, not as cold as teal.
- **Neutral (slate):** slate ramp `#F8FAFC` → `#0F172A` — backgrounds, surfaces, borders, all body text. Slightly cool to complement indigo without clashing.
- **Semantic success (green):** `#16A34A` — active status, done requests, paid invoices. Clear, unambiguous positive signal.
- **Semantic warning (amber):** `#D97706` — in-progress requests, unassigned SIM/phone flags. Visible without alarming.
- **Semantic error/destructive (red):** `#DC2626` — cancellations, destructive actions, error states.
- **Semantic info (blue):** `#2563EB` — submitted status, informational toasts.
- **Mode:** Light and dark. Light mode is primary (office context). Dark mode uses a deep slate base (`#0F172A`) with lightened accent values for contrast.

## Spacing and layout

- **Grid:** 12-column, 24px gutter, 8px base unit
- **Spacing philosophy:** generous between sections, tight within components. Table rows and list items are dense. Dashboard cards breathe. Forms use vertical rhythm with 16px between fields.
- **Breakpoint strategy:** desktop-first — this is primarily a desktop operations dashboard. Responsive down to tablet (768px). Mobile is functional but not the primary target for admin and company roles. Customer dashboard is the most likely mobile use case.

## Component patterns

- **Navigation:** persistent left sidebar on desktop (240px wide), collapsed to icon-only at smaller viewports. Top bar carries page title, user avatar, and role badge. No hamburger menu — sidebar is always visible on desktop.
- **Forms:** vertical label-above-field layout. Labels in `text-secondary`, fields with `border` color, focus ring in indigo. Inline validation errors below the field in `status-error` color. Submit button always primary.
- **Cards:** `surface` background, `border` outline, `radius-lg`, `shadow-sm`. Headers use a slightly darker background (`background-secondary`). Cards are the primary container for customer detail, phone, and SIM data.
- **Modals:** centered overlay on `overlay` z-index. Semi-transparent backdrop. `radius-xl`, `shadow-xl`. Max-width 560px for forms, wider for tables. Footer with cancel (ghost) + confirm (primary) buttons.
- **Empty states:** centered in their container. Icon in `text-disabled`, heading in `text-primary` at `font-size-lg`, description in `text-secondary`. Single CTA button. Used for empty request lists, no customers yet, etc.
- **Error states:** inline for form fields. Toast for async operation failures. Dedicated error page for route-level errors. Never a modal for a non-critical error.

## Motion

- **Philosophy:** subtle and purposeful. Motion confirms actions and communicates state changes — it does not entertain.
- **Key moments:** sidebar transitions (slide, 200ms); toast entry (slide-up + fade, 200ms); modal open (fade + scale from 95%, 200ms); page route transitions (fade, 150ms); button press (scale 0.98, 100ms).
- **Duration defaults:** fast 100ms (micro-interactions), normal 200ms (most transitions), slow 300ms (modal, overlay).
