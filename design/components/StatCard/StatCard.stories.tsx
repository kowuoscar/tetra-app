import type { Meta, StoryObj } from "@storybook/react"
import { StatCard } from "./StatCard"
import React from "react"

const meta = {
  title: "UI/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={{ minWidth: "200px" }}><Story /></div>],
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Active Phones", value: "24", sub: "Across all customers" },
}

export const WithPositiveSub: Story = {
  args: { label: "Total Customers", value: "12", sub: "+2 this month", subPositive: true },
}

export const StatsGrid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", width: "800px" }}>
      <StatCard label="Active Customers" value="12" />
      <StatCard label="Active Phones"    value="48" sub="+3 this month" subPositive />
      <StatCard label="Active SIM Cards" value="52" />
      <StatCard label="Open Requests"    value="7"  sub="3 in progress" />
    </div>
  ),
}

export const Dark: Story = {
  args: Default.args,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}
