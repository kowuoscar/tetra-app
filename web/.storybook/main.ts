import type { StorybookConfig } from "@storybook/nextjs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../design/components/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  webpackFinal: async (config) => {
    const existingModules = (config.resolve?.modules ?? []) as string[]
    config.resolve = {
      ...config.resolve,
      modules: [...existingModules, path.resolve(__dirname, "../node_modules")],
    }
    return config
  },
}

export default config
