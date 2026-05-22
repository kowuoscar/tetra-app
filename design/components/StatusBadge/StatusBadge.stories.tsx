import type { Meta, StoryObj } from "@storybook/react"
import { StatusBadge } from "./StatusBadge"

const meta = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "select", options: ["success", "warning", "error", "info", "neutral", "brand"] },
    dot:     { control: "boolean" },
  },
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Active", variant: "success" },
}

export const Success: Story = { args: { children: "Done",       variant: "success" } }
export const Warning: Story = { args: { children: "In Progress",variant: "warning" } }
export const Error:   Story = { args: { children: "Cancelled",  variant: "error"   } }
export const Info:    Story = { args: { children: "Submitted",  variant: "info"    } }
export const Neutral: Story = { args: { children: "Replaced",   variant: "neutral" } }
export const Brand:   Story = { args: { children: "Company-owned", variant: "brand", dot: false } }

export const NoDot: Story = {
  args: { children: "Unused — no SIM", variant: "warning", dot: false },
}

export const RequestStatuses: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px" }}>
      <StatusBadge variant="info">Submitted</StatusBadge>
      <StatusBadge variant="warning">In Progress</StatusBadge>
      <StatusBadge variant="success">Done</StatusBadge>
    </div>
  ),
}

export const InvoiceStatuses: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px" }}>
      <StatusBadge variant="neutral">Draft</StatusBadge>
      <StatusBadge variant="info">Sent</StatusBadge>
      <StatusBadge variant="success">Paid</StatusBadge>
    </div>
  ),
}

export const Dark: Story = {
  args: { ...Default.args },
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}
