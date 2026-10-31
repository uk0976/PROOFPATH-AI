import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/utils/cn"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const variantStyles = {
      primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm active:translate-y-[0.5px]",
      secondary: "bg-white text-navy-900 border border-slate-200 hover:bg-slate-50 shadow-sm",
      outline: "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-navy-900",
      danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    }

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-9 px-4 text-sm rounded-md",
      lg: "h-11 px-6 text-base rounded-lg font-medium",
    }

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none gap-2",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
