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
      primary: "bg-primary text-white hover:bg-primary-hover shadow-subtle active:translate-y-[0.5px]",
      secondary: "bg-surface text-ink border border-border hover:bg-background shadow-subtle",
      outline: "bg-transparent border border-border text-ink hover:bg-background",
      ghost: "bg-transparent text-ink-secondary hover:bg-background hover:text-ink",
      danger: "bg-status-danger text-white hover:opacity-90 shadow-subtle",
    }

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-9 px-4 text-xs font-medium rounded-md",
      lg: "h-10 px-5 text-sm font-medium rounded-lg",
    }

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none gap-2",
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
