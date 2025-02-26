
import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-[15px] text-[#111827] shadow-sm transition-colors placeholder:text-[#4B5563] focus:border-[#0A66C2] focus:outline-none focus:ring-1 focus:ring-[#0A66C2] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
