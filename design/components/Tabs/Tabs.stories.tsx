import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, within } from "@storybook/test"
import { Tabs } from "./Tabs"
import { useState } from "react"
import React from "react"

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={{ minWidth: "480px" }}><Story /></div>],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

const ITEMS = [
  { key: "phones", label: "Phones" },
  { key: "sims", label: "SIM Cards" },
  { key: "requests", label: "Requests" },
  { key: "costs", label: "Cost Breakdown" },
]

function TabsDemo() {
  const [active, setActive] = useState("phones")
  return <Tabs items={ITEMS} activeKey={active} onChange={setActive} />
}

export const Default: Story = {
  render: () => <TabsDemo />,
}

export const Dark: Story = {
  render: Default.render,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}

export const TabSwitchInteraction: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const simsTab = canvas.getByRole("tab", { name: /sim cards/i })
    await userEvent.click(simsTab)
    await expect(simsTab).toHaveAttribute("aria-selected", "true")
  },
}
