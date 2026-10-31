import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { BookOpen, ExternalLink, Globe, FileText, CheckCircle2 } from "lucide-react"
import { cn } from "@/utils/cn"

export const SourceNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const sourceType = String(meta.source_type || "pdf").toLowerCase()
  const url = data.url || meta.uri
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

  const TypeIcon = sourceType === "url" ? Globe : sourceType === "pdf" ? FileText : BookOpen

  return (
    <div
      className={cn(
        "w-[260px] rounded-xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer",
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
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TypeIcon className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
            {sourceType.toUpperCase()} Source
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Ingested</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <h5 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
          {String(data.label || meta.title || "Source Document")}
        </h5>

        <div className="flex items-center justify-between text-[10.5px] text-slate-500">
          <span className="truncate max-w-[150px]">{meta.author || "Document Author"}</span>
          <span className="shrink-0">{meta.chunk_count ? `${meta.chunk_count} chunks` : "Parsed"}</span>
        </div>

        {url && (
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-blue-600">
            <span className="truncate max-w-[180px] text-slate-400">{url}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
      />
    </div>
  )
}
