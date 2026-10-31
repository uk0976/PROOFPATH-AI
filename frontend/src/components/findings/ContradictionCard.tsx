import React from "react"
import { AlertCircle, FileText, Globe, Quote, ExternalLink } from "lucide-react"
import { ContradictionItem } from "@/types"
import { Badge } from "@/components/ui/badge"
import { getSeverityBadge } from "@/utils/formatters"

interface ContradictionCardProps {
  conflict: ContradictionItem
}

export const ContradictionCard: React.FC<ContradictionCardProps> = ({ conflict }) => {
  const sev = getSeverityBadge(conflict.severity)

  return (
    <div className="border border-slate-200/90 rounded-xl bg-white p-5 shadow-card space-y-4 hover:border-slate-300 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${sev.bgColor} ${sev.color} ${sev.borderColor} border`}>
              <AlertCircle className="w-3 h-3 mr-1" />
              {conflict.severity} Severity Conflict
            </span>
            {conflict.requirement_text && (
              <span className="text-xs text-slate-500 font-medium">
                Criterion: {conflict.requirement_text.slice(0, 50)}...
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-slate-900 leading-snug">
            {conflict.conflicting_aspect}
          </h4>
        </div>
      </div>

      {/* Side-by-side competing claims */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {/* Claim A */}
        <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5 truncate max-w-[200px]">
              {conflict.claim_a.source_type === "pdf" ? <FileText className="w-3.5 h-3.5 text-slate-500" /> : <Globe className="w-3.5 h-3.5 text-slate-500" />}
              {conflict.claim_a.source_title}
            </span>
            {conflict.claim_a.page_number && (
              <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                p.{conflict.claim_a.page_number}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-900">
            {conflict.claim_a.claim_text}
          </p>
          <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-200/80 flex items-start gap-1.5">
            <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span>"{conflict.claim_a.exact_quote}"</span>
          </div>
        </div>

        {/* Claim B */}
        <div className="p-3.5 rounded-lg border border-rose-100/80 bg-rose-50/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5 truncate max-w-[200px]">
              {conflict.claim_b.source_type === "pdf" ? <FileText className="w-3.5 h-3.5 text-slate-500" /> : <Globe className="w-3.5 h-3.5 text-slate-500" />}
              {conflict.claim_b.source_title}
            </span>
            {conflict.claim_b.page_number && (
              <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                p.{conflict.claim_b.page_number}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-900">
            {conflict.claim_b.claim_text}
          </p>
          <div className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200/80 flex items-start gap-1.5">
            <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span>"{conflict.claim_b.exact_quote}"</span>
          </div>
        </div>
      </div>

      {/* Synthesis Verdict */}
      {conflict.synthesis_verdict && (
        <div className="p-3 rounded-lg bg-navy-50/50 border border-navy-100 text-xs space-y-1">
          <span className="font-semibold text-navy-900 block text-[11px] uppercase tracking-wider">
            Forensic Cross-Examination Verdict
          </span>
          <p className="text-slate-700 leading-relaxed">
            {conflict.synthesis_verdict}
          </p>
        </div>
      )}
    </div>
  )
}
