import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { ShieldAlert, ArrowLeftRight } from "lucide-react"
import { cn } from "@/utils/cn"

export const ContradictionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const severity = String(data.severity || meta.severity || "high").toLowerCase()
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

  const isHigh = severity === "high"

  return (
    <div
      className={cn(
        "w-[270px] rounded-xl bg-white border border-rose-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer",
        selected && "ring-2 ring-rose-600 ring-offset-2 border-rose-600 shadow-lg",
        isHighlighted && "ring-2 ring-blue-500 shadow-lg scale-[1.02]",
        isDimmed && "opacity-25 grayscale-[60%]"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="px-3 py-2 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900">
            Contradiction
          </span>
        </div>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold border",
            isHigh
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-amber-100 text-amber-800 border-amber-200"
          )}
        >
          {isHigh ? "CRITICAL" : "MODERATE"}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
          {String(data.label || meta.conflicting_aspect || "Conflicting claims detected")}
        </p>

        {(meta.claim_a_source || meta.claim_b_source) && (
          <div className="flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-100">
            <span className="truncate max-w-[100px] font-semibold">{meta.claim_a_source || "Source A"}</span>
            <ArrowLeftRight className="w-3 h-3 text-rose-400 shrink-0 mx-1" />
            <span className="truncate max-w-[100px] font-semibold">{meta.claim_b_source || "Source B"}</span>
          </div>
        )}

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>Cross-source tension</span>
          <span className="text-rose-600 font-semibold hover:underline">Compare claims</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-rose-600 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-rose-600 !border-2 !border-white"
      />
    </div>
  )
}
