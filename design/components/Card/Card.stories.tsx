import type { Meta, StoryObj } from "@storybook/react"
import { Card, CardHeader, CardBody, CardFooter, MetaRow } from "./Card"
import React from "react"

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    shadow: { control: "select", options: ["none", "sm", "md"] },
  },
  decorators: [(Story) => <div style={{ minWidth: "320px" }}><Story /></div>],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card shadow="sm">
      <CardHeader>iPhone 14 Pro</CardHeader>
      <CardBody>
        <MetaRow label="Model" value="Apple iPhone 14 Pro" />
        <MetaRow label="Ownership" value="Customer" />
        <MetaRow label="Monthly fee" value="€45/mo" mono />
      </CardBody>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card shadow="sm">
      <CardHeader>Al Barsha Trading LLC</CardHeader>
      <CardBody>
        <MetaRow label="Phones" value="4 active" />
        <MetaRow label="SIM cards" value="4 active · 1 unassigned" />
        <MetaRow label="Current month cost" value="€ 312.50" mono />
      </CardBody>
      <CardFooter>
        <button style={{ fontSize: "12px", padding: "4px 12px", cursor: "pointer" }}>View detail</button>
      </CardFooter>
    </Card>
  ),
}

export const NoShadow: Story = {
  args: { shadow: "none" },
  render: (args) => (
    <Card {...args}>
      <CardHeader>Prepaid SIM</CardHeader>
      <CardBody>
        <MetaRow label="Type" value="Prepaid" />
        <MetaRow label="Monthly fee" value="€ 25.00" mono />
      </CardBody>
    </Card>
  ),
}

export const Dark: Story = {
  render: Default.render,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}
