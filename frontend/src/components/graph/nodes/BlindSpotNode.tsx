import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { HelpCircle, Sparkles } from "lucide-react"
import { cn } from "@/utils/cn"

export const BlindSpotNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const risk = String(data.severity || meta.risk_level || "high").toLowerCase()
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

  const isHigh = risk === "high"

  return (
    <div
      className={cn(
        "w-[260px] rounded-xl bg-white border border-indigo-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer",
        selected && "ring-2 ring-indigo-600 ring-offset-2 border-indigo-600 shadow-lg",
        isHighlighted && "ring-2 ring-blue-500 shadow-lg scale-[1.02]",
        isDimmed && "opacity-25 grayscale-[60%]"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="px-3 py-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
            Unasked Inquiry
          </span>
        </div>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold border",
            isHigh
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-indigo-100 text-indigo-800 border-indigo-200"
          )}
        >
          {isHigh ? "High Risk" : "Medium"}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
          {String(data.label || meta.question || "Strategic Blindspot Question")}
        </p>

        {meta.rationale && (
          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 bg-indigo-50/30 p-2 rounded border border-indigo-100/50">
            {meta.rationale}
          </p>
        )}

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>{meta.category || "Strategic Risk"}</span>
          <span className="text-indigo-600 font-semibold hover:underline">Explore inquiry</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-indigo-600 !border-2 !border-white"
      />
    </div>
  )
}
