import type { Meta, StoryObj } from "@storybook/react"
import { AppShell } from "./AppShell"
import type { NavItem } from "./AppShell"
import React from "react"

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

const NAV_ITEMS: NavItem[] = [
  { label: "Overview",      href: "/overview",     roles: ["admin", "company"] },
  { label: "Customers",     href: "/customers",    roles: ["admin", "company"] },
  { label: "Requests",      href: "/requests",     roles: ["admin", "company", "customer"] },
  { label: "Billing",       href: "/invoices",     roles: ["admin", "company"] },
  { label: "Settings",      href: "/settings",     roles: ["admin"] },
  { label: "My Phones",     href: "/phones",       roles: ["customer"] },
  { label: "My SIM Cards",  href: "/sim-cards",    roles: ["customer"] },
]

export const AdminView: Story = {
  args: {
    user: { name: "Oscar Admin", role: "admin", initials: "OA" },
    currentPath: "/customers",
    navItems: NAV_ITEMS,
    breadcrumb: [{ label: "Customers" }],
    children: (
      <div style={{ padding: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>Customers</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Page content goes here.</p>
      </div>
    ),
  },
}

export const CompanyView: Story = {
  args: {
    ...AdminView.args,
    user: { name: "Company User", role: "company", initials: "CU" },
    currentPath: "/requests",
    breadcrumb: [{ label: "Requests" }],
  },
}

export const CustomerView: Story = {
  args: {
    ...AdminView.args,
    user: { name: "Customer User", role: "customer", initials: "CU" },
    currentPath: "/phones",
    breadcrumb: [{ label: "My Phones" }],
  },
}

export const WithBreadcrumb: Story = {
  args: {
    ...AdminView.args,
    currentPath: "/customers/1",
    breadcrumb: [
      { label: "Customers", href: "/customers" },
      { label: "Al Barsha Trading LLC" },
    ],
  },
}

export const Dark: Story = {
  args: AdminView.args,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}
