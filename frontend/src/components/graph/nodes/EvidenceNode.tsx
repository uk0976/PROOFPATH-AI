import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { Layers, MapPin } from "lucide-react"
import { cn } from "@/utils/cn"

export const EvidenceNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const passage = String(meta.passage || data.quote || "")
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

  return (
    <div
      className={cn(
        "w-[260px] rounded-xl bg-white border border-cyan-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer",
        selected && "ring-2 ring-cyan-600 ring-offset-2 border-cyan-600 shadow-lg",
        isHighlighted && "ring-2 ring-blue-500 shadow-lg scale-[1.02]",
        isDimmed && "opacity-25 grayscale-[60%]"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="px-3 py-2 bg-cyan-50/70 border-b border-cyan-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-700" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-900">
            Evidence Passage
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-cyan-700 bg-white/80 px-1.5 py-0.5 rounded border border-cyan-200">
          <MapPin className="w-2.5 h-2.5" />
          <span>p. {String(data.page || 1)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-[11px] text-slate-700 line-clamp-3 leading-relaxed font-normal bg-slate-50/70 p-2 rounded border border-slate-100">
          {passage || "Verbatim passage chunk extracted from document."}
        </p>

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span className="truncate max-w-[150px]">{meta.location || `Page ${String(data.page || 1)}`}</span>
          <span className="text-cyan-700 font-semibold hover:underline">View chunk</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-cyan-600 !border-2 !border-white"
      />
    </div>
  )
}
