import React from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react"
import { findingService } from "@/services/findingService"
import { Badge } from "@/components/ui/badge"

export const GapAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: gaps, isLoading } = useQuery({
    queryKey: ["gaps", id],
    queryFn: () => findingService.getGaps(id!),
    enabled: !!id,
  })

  const { data: requirements } = useQuery({
    queryKey: ["requirements", id],
    queryFn: () => findingService.getRequirements(id!),
    enabled: !!id,
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Information Gap & Silence Analysis
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Detects what is completely unaddressed across your provided sources and where evidence is dangerously sparse.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Total Silences (Uncovered)
            </span>
            <EyeOff className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900">
            {requirements?.filter((r) => r.status === "uncovered").length || 0}
          </div>
          <p className="text-[11px] text-rose-700">
            Zero evidence found in any document
          </p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Sparse Evidence (Partial)
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900">
            {requirements?.filter((r) => r.status === "partial").length || 0}
          </div>
          <p className="text-[11px] text-amber-700">
            Only 1 uncorroborated claim provided
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Adequately Backed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900">
            {requirements?.filter((r) => r.status === "covered").length || 0}
          </div>
          <p className="text-[11px] text-emerald-700">
            Corroborated by 2 or more sources
          </p>
        </div>
      </div>

      {/* Detailed Gaps List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Identified Information Gaps & Remediation Actions
        </h2>

        {isLoading ? (
          <div className="text-xs text-slate-500 py-6">Analyzing evidence coverage...</div>
        ) : gaps?.length === 0 ? (
          <div className="p-8 rounded-xl border border-slate-200 bg-white text-center text-xs text-slate-500">
            No critical information gaps detected. Every evaluation requirement is substantiated by evidence.
          </div>
        ) : (
          <div className="space-y-4">
            {gaps?.map((gap, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-card space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={gap.status === "uncovered" ? "danger" : "warning"}>
                        {gap.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400">
                        Category: {gap.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {gap.requirement_text}
                    </h3>
                  </div>
                  <Badge variant={gap.impact_level === "high" ? "danger" : "secondary"}>
                    {gap.impact_level.toUpperCase()} IMPACT
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {gap.gap_summary}
                </p>

                {/* Missing Aspects Pills */}
                {gap.missing_aspects && gap.missing_aspects.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Omitted Parameters:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {gap.missing_aspects.map((aspect, aIdx) => (
                        <span key={aIdx} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium">
                          • {aspect}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Action */}
                <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-700">
                  <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Suggested Action: </span>
                    <span>{gap.suggested_action}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
