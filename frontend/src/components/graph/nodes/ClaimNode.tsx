import React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { Quote, CheckCircle2, FileText } from "lucide-react"
import { cn } from "@/utils/cn"

export const ClaimNode: React.FC<NodeProps> = ({ data, selected }) => {
  const meta = (data.meta as Record<string, any>) || {}
  const quote = String(data.quote || meta.exact_quote || "")
  const isVerified = Boolean(meta.is_verified)
  const isDimmed = Boolean(data.isDimmed)
  const isHighlighted = Boolean(data.isHighlighted)

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
      <div className="px-3 py-2 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[10px] font-semibold text-blue-900 truncate">
            {String(data.source_name || meta.source_title || "Claim Source")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isVerified ? (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Verified
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {meta.claim_type || "Claim"}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
          {String(data.label || meta.full_claim || "Atomic Claim")}
        </p>

        {quote && (
          <div className="p-2 rounded-md bg-slate-50 border border-slate-100 text-[10.5px] text-slate-600 italic flex items-start gap-1.5">
            <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">"{quote}"</span>
          </div>
        )}

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>{meta.date_reference ? `Ref: ${meta.date_reference}` : "Extracted assertion"}</span>
          {meta.confidence_score !== undefined && (
            <span className="font-semibold text-slate-600">
              {(meta.confidence_score * 100).toFixed(0)}% conf
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-blue-600 !border-2 !border-white"
      />
    </div>
  )
}
