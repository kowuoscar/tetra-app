import type { Meta, StoryObj } from "@storybook/react"
import { EmptyState } from "./EmptyState"
import React from "react"

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={{ minWidth: "480px" }}><Story /></div>],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Default: Story = {
  args: {
    icon: <PhoneIcon />,
    title: "No phones yet",
    description: "This customer doesn't have any phones assigned. Add one to get started.",
  },
}

export const WithAction: Story = {
  args: {
    icon: <PhoneIcon />,
    title: "No phones yet",
    description: "This customer doesn't have any phones assigned.",
    action: (
      <button style={{ padding: "8px 16px", cursor: "pointer" }}>Add Phone</button>
    ),
  },
}

export const NoIcon: Story = {
  args: {
    title: "No requests",
    description: "No requests match your current filters.",
  },
}

export const Dark: Story = {
  args: WithAction.args,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}
