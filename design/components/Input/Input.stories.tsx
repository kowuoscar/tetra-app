import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, within } from "@storybook/test"
import { Input } from "./Input"

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    disabled: { control: "boolean" },
    error:    { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: "320px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Customer name",
    placeholder: "e.g. Al Barsha Trading LLC",
    helperText: "Legal entity name as registered",
  },
}

export const WithHelperText: Story = {
  args: {
    label: "Base monthly fee (€)",
    placeholder: "0.00",
    helperText: "Fixed amount billed each month",
  },
}

export const Error: Story = {
  args: {
    label: "WhatsApp group ID",
    defaultValue: "not-a-valid-id",
    error: true,
    errorText: "Must be a valid WhatsApp group identifier",
  },
}

export const Disabled: Story = {
  args: {
    label: "Actual amount (€)",
    placeholder: "Enter at month-end",
    disabled: true,
    helperText: "Postpaid SIMs only — entered by admin",
  },
}

export const Dark: Story = {
  args: { ...Default.args },
  parameters: {
    themes: { themeOverride: "dark" },
    backgrounds: { default: "dark" },
  },
}

export const TypingInteraction: Story = {
  args: { label: "Customer name", placeholder: "e.g. Al Barsha Trading LLC" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox")
    await userEvent.type(input, "Al Barsha Trading LLC")
    await expect(input).toHaveValue("Al Barsha Trading LLC")
  },
}
