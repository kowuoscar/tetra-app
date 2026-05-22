import type { Preview } from "@storybook/react"
import "../src/styles/globals.css"

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Global theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals["theme"] as string
      document.documentElement.setAttribute("data-theme", theme ?? "light")
      return <Story />
    },
  ],
  parameters: {
    viewport: {
      viewports: {
        mobile1: { name: "Mobile (375px)", styles: { width: "375px", height: "812px" } },
        tablet:  { name: "Tablet (768px)",  styles: { width: "768px",  height: "1024px" } },
        desktop: { name: "Desktop (1280px)", styles: { width: "1280px", height: "900px" } },
      },
    },
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "label", enabled: true },
          { id: "aria-required-attr", enabled: true },
        ],
      },
    },
  },
}

export default preview
