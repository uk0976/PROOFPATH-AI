import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { Target, Award } from "lucide-react"
import { cn } from "@/utils/cn"

export const GoalNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const readiness = meta.readiness_score ? Number(meta.readiness_score).toFixed(0) : null
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

  return (
    <div
      className={cn(
        "w-[280px] rounded-xl bg-white border border-slate-300 shadow-md transition-all duration-200 overflow-hidden cursor-pointer",
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
      <div className="bg-[#172B45] text-white px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-200">
            Research Goal
          </span>
        </div>
        {readiness !== null && (
          <div className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded text-[11px] font-bold">
            <Award className="w-3 h-3 text-amber-300" />
            <span>DRI {readiness}%</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-1.5">
        <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
          {String(data.label || "Research Goal")}
        </h4>
        {meta.research_goal && (
          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
            {meta.research_goal}
          </p>
        )}
        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
          <span>Root Decision Scope</span>
          <span className="font-medium text-slate-600">Click to inspect</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-white"
      />
    </div>
  )
}
