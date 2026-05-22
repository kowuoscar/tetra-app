import type { Meta, StoryObj } from "@storybook/react"
import { Toast } from "./Toast"
import React from "react"

const meta = {
  title: "UI/Toast",
  component: Toast,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "select", options: ["success", "warning", "error", "info"] },
  },
} satisfies Meta<typeof Toast>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { variant: "success", title: "Customer created", description: "Al Barsha Trading LLC was added." },
}

export const Success: Story = {
  args: { variant: "success", title: "Request marked done", description: "Phone repair completed." },
}

export const Warning: Story = {
  args: { variant: "warning", title: "SIM unassigned", description: "This SIM has no phone assigned." },
}

export const Error: Story = {
  args: { variant: "error", title: "Failed to save", description: "Check your connection and try again." },
}

export const Info: Story = {
  args: { variant: "info", title: "Request submitted", description: "Your request is now in review." },
}

export const WithClose: Story = {
  args: { variant: "success", title: "Saved", onClose: () => {} },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Toast variant="success" title="Request marked done" description="Phone repair completed." />
      <Toast variant="warning" title="SIM unassigned" description="This SIM has no phone assigned." />
      <Toast variant="error"   title="Failed to save"    description="Check your connection and try again." />
      <Toast variant="info"    title="Request submitted"  description="Your request is now in review." />
    </div>
  ),
}

export const Dark: Story = {
  render: AllVariants.render,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}
