import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { AlertTriangle, HelpCircle } from "lucide-react"
import { cn } from "@/utils/cn"

export const GapNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const severity = String(data.severity || meta.severity || "high").toLowerCase()
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

  const isHigh = severity === "high"

  return (
    <div
      className={cn(
        "w-[260px] rounded-xl bg-white border border-amber-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer",
        selected && "ring-2 ring-amber-600 ring-offset-2 border-amber-600 shadow-lg",
        isHighlighted && "ring-2 ring-blue-500 shadow-lg scale-[1.02]",
        isDimmed && "opacity-25 grayscale-[60%]"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="px-3 py-2 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
            Information Gap
          </span>
        </div>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold border",
            isHigh
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-amber-100 text-amber-800 border-amber-200"
          )}
        >
          {isHigh ? "High Impact" : "Medium"}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
          {String(data.label || "Missing critical evidence")}
        </p>

        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 bg-amber-50/40 p-2 rounded border border-amber-100/60">
          {meta.missing_explanation || "No source documents verify this requirement."}
        </p>

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>Unresolved criterion</span>
          <span className="text-amber-700 font-semibold hover:underline">Inspect gap</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white"
      />
    </div>
  )
}
