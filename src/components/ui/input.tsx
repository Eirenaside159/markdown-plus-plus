import * as React from "react"

import { cn } from "@/lib"

type InputProps = React.ComponentProps<"input"> & {
  onePassword?: "ignore" | "allow" | "block"
  "data-1p-ignore"?: string
  "data-1password-blocked"?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, autoComplete, onePassword = "ignore", ...props }, ref) => {
    const onePasswordAttributes =
      onePassword === "allow"
        ? {}
        : onePassword === "block"
        ? {
            "data-1password-blocked": props["data-1password-blocked"] ?? "true",
          }
        : {
            "data-1p-ignore": props["data-1p-ignore"] ?? "true",
          }

    return (
      <input
        type={type}
        autoComplete={autoComplete ?? "off"}
        {...props}
        {...onePasswordAttributes}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
