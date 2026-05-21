import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-border bg-transparent px-2.5 py-1 text-sm text-text-primary transition-colors outline-none placeholder:text-text-disabled file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:opacity-50 aria-invalid:border-status-error aria-invalid:ring-3 aria-invalid:ring-status-error/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
