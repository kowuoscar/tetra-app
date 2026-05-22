import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, within } from "@storybook/test"
import { Button } from "./Button"

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "destructive"] },
    size:    { control: "select", options: ["sm", "md", "lg"] },
    loading:  { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Submit Request", variant: "primary", size: "md" },
}

export const Primary: Story = {
  args: { ...Default.args, variant: "primary" },
}

export const Secondary: Story = {
  args: { ...Default.args, children: "View Customer", variant: "secondary" },
}

export const Ghost: Story = {
  args: { ...Default.args, children: "Cancel", variant: "ghost" },
}

export const Destructive: Story = {
  args: { ...Default.args, children: "Mark Cancelled", variant: "destructive" },
}

export const Small: Story = {
  args: { ...Default.args, size: "sm" },
}

export const Large: Story = {
  args: { ...Default.args, size: "lg" },
}

export const Loading: Story = {
  args: { ...Default.args, loading: true },
}

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Button variant="primary">Submit Request</Button>
      <Button variant="secondary">View Customer</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Mark Cancelled</Button>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const Dark: Story = {
  args: { ...Default.args },
  parameters: {
    themes: { themeOverride: "dark" },
    backgrounds: { default: "dark" },
  },
}

export const ClickInteraction: Story = {
  args: { ...Default.args, onClick: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: /submit request/i })
    await expect(button).toBeInTheDocument()
    await userEvent.click(button)
  },
}

export const DisabledNoClick: Story = {
  args: { ...Default.args, disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: /submit request/i })
    await expect(button).toBeDisabled()
  },
}
