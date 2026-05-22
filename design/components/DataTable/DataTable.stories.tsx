import type { Meta, StoryObj } from "@storybook/react"
import { expect, within } from "@storybook/test"
import { DataTable } from "./DataTable"
import React from "react"

const meta = {
  title: "UI/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

interface Customer { id: string; name: string; phones: number; cost: string; status: string }

const COLUMNS = [
  { key: "name",   header: "Customer",   render: (r: Customer) => r.name,                      },
  { key: "phones", header: "Phones",     render: (r: Customer) => `${r.phones} active`,         },
  { key: "cost",   header: "This Month", render: (r: Customer) => r.cost, mono: true,           },
  { key: "status", header: "Status",     render: (r: Customer) => r.status, secondary: true,    },
]

const ROWS: Customer[] = [
  { id: "1", name: "Al Barsha Trading LLC",  phones: 4, cost: "€ 312.50", status: "2 open requests" },
  { id: "2", name: "Deira Logistics Co.",    phones: 2, cost: "€ 90.00",  status: "Active" },
  { id: "3", name: "Jumeirah Real Estate",   phones: 6, cost: "€ 540.00", status: "1 open request" },
]

export const Default: Story = {
  render: () => (
    <DataTable
      columns={COLUMNS}
      rows={ROWS}
      getRowKey={(r) => r.id}
      onRowClick={(r) => alert(`Clicked: ${r.name}`)}
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <DataTable
      columns={COLUMNS}
      rows={[]}
      getRowKey={(r) => r.id}
      empty={<span>No customers found</span>}
    />
  ),
}

export const Dark: Story = {
  render: Default.render,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}

export const EmptyState: Story = {
  render: Empty.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("No customers found")).toBeInTheDocument()
  },
}
