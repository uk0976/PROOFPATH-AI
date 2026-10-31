import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { CheckSquare, AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react"
import { cn } from "@/utils/cn"

export const RequirementNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const status = String(data.status || meta.status || "unaddressed").toLowerCase()
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

  const statusConfig = {
    covered: {
      label: "Covered",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      border: "border-emerald-300",
      icon: ShieldCheck,
      iconColor: "text-emerald-600",
    },
    partial: {
      label: "Partial",
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      border: "border-amber-300",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
    },
    conflict: {
      label: "Conflict",
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      border: "border-rose-400",
      icon: AlertCircle,
      iconColor: "text-rose-600",
    },
    unaddressed: {
      label: "Unaddressed",
      bg: "bg-slate-50 text-slate-600 border-slate-200",
      border: "border-slate-300",
      icon: AlertCircle,
      iconColor: "text-slate-400",
    },
    uncovered: {
      label: "Unaddressed",
      bg: "bg-slate-50 text-slate-600 border-slate-200",
      border: "border-slate-300",
      icon: AlertCircle,
      iconColor: "text-slate-400",
    },
  }[status] || {
    label: status,
    bg: "bg-slate-50 text-slate-600 border-slate-200",
    border: "border-slate-300",
    icon: CheckSquare,
    iconColor: "text-slate-500",
  }

  const StatusIcon = statusConfig.icon

  return (
    <div
      className={cn(
        "w-[260px] rounded-xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer",
        statusConfig.border,
        selected && "ring-2 ring-primary ring-offset-2 border-primary shadow-lg",
        isHighlighted && "ring-2 ring-blue-500 shadow-lg scale-[1.02]",
        isDimmed && "opacity-25 grayscale-[60%]"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
      />

      {/* Header */}
      <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">
            {meta.category || "Requirement"}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
            statusConfig.bg
          )}
        >
          <StatusIcon className={cn("w-3 h-3", statusConfig.iconColor)} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-3">
          {String(data.label || meta.full_text || "Requirement Criterion")}
        </p>
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>Weight: {meta.weight || 1.0}x</span>
          <span className="text-blue-600 font-medium hover:underline">Inspect details</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-slate-500 !border-2 !border-white"
      />
    </div>
  )
}
