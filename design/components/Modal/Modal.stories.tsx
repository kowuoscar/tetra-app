import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, within } from "@storybook/test"
import { Modal } from "./Modal"
import { useState } from "react"
import React from "react"

const meta = {
  title: "UI/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

function ModalDemo({ title = "Create Customer", wide = false }: { title?: string; wide?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: "8px 16px", cursor: "pointer" }}>
        Open modal
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        maxWidth={wide ? "wide" : "default"}
        footer={
          <>
            <button onClick={() => setOpen(false)} style={{ padding: "8px 16px", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={() => setOpen(false)} style={{ padding: "8px 16px", cursor: "pointer" }}>
              Create
            </button>
          </>
        }
      >
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Modal body content goes here.
        </p>
      </Modal>
    </>
  )
}

export const Default: Story = {
  render: () => <ModalDemo />,
}

export const Wide: Story = {
  render: () => <ModalDemo title="Edit Customer Details" wide />,
}

export const Dark: Story = {
  render: Default.render,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}

export const OpenInteraction: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /open modal/i })
    await userEvent.click(trigger)
    await expect(canvas.getByRole("dialog")).toBeInTheDocument()
  },
}

export const CloseOnEscape: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /open modal/i }))
    await expect(canvas.getByRole("dialog")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
  },
}
