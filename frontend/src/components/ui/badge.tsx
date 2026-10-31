import * as React from "react"
import { cn } from "@/utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-primary text-white",
    secondary: "bg-secondary-light text-secondary border border-border",
    success: "bg-status-success-bg text-status-success border border-status-success-border",
    warning: "bg-status-warning-bg text-status-warning border border-status-warning-border",
    danger: "bg-status-danger-bg text-status-danger border border-status-danger-border",
    outline: "border border-border text-ink-secondary bg-surface",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors gap-1",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}
