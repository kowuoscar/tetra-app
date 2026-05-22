import type { Meta, StoryObj } from "@storybook/react"
import { Skeleton, SkeletonText, SkeletonCard, Spinner } from "./Skeleton"
import React from "react"

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { width: 200, height: 20 },
}

export const Text: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "280px" }}>
      <SkeletonText width="80%" />
      <SkeletonText width="60%" />
      <SkeletonText width="70%" />
    </div>
  ),
}

export const CardSkeleton: Story = {
  render: () => <div style={{ width: "280px" }}><SkeletonCard rows={3} /></div>,
}

export const SpinnerMd: Story = {
  render: () => <Spinner size="md" />,
}

export const SpinnerLg: Story = {
  render: () => <Spinner size="lg" />,
}

export const Dark: Story = {
  render: CardSkeleton.render,
  parameters: { themes: { themeOverride: "dark" }, backgrounds: { default: "dark" } },
}
