import React, { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  CheckSquare,
  AlertTriangle,
  FileCheck2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { findingService } from "@/services/findingService"
import { reportService } from "@/services/reportService"
import { researchService } from "@/services/researchService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const VerificationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: () => researchService.getSession(id!),
    enabled: !!id,
  })

  const { data: conflicts } = useQuery({
    queryKey: ["conflicts", id],
    queryFn: () => findingService.getConflicts(id!),
    enabled: !!id,
  })

  const { data: gaps } = useQuery({
    queryKey: ["gaps", id],
    queryFn: () => findingService.getGaps(id!),
    enabled: !!id,
  })

  const { data: blindspots } = useQuery({
    queryKey: ["blindspots", id],
    queryFn: () => reportService.getBlindspots(id!),
    enabled: !!id,
  })

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const totalItems = (conflicts?.length || 0) + (gaps?.length || 0) + (blindspots?.length || 0)
  const completedCount = Object.values(checkedItems).filter(Boolean).length

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brand" />
            <span>Pre-Decision Verification Planner</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Actionable verification checklist to resolve before signing off on this decision.
          </p>
        </div>

        {/* Counter */}
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Verification Sign-off
          </span>
          <span className="text-lg font-bold text-slate-900">
            {completedCount} / {totalItems} Resolved
          </span>
        </div>
      </div>

      {/* Section 1: Resolve Critical Contradictions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>1. Cross-Source Contradictions Requiring Arbitration</span>
          </h2>
          <Badge variant="outline">{conflicts?.length || 0} Items</Badge>
        </div>

        <div className="space-y-2">
          {conflicts?.map((c) => {
            const key = `conflict-${c.id}`
            const isDone = !!checkedItems[key]

            return (
              <label
                key={c.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleCheck(key)}
                  className="mt-1 rounded text-brand focus:ring-brand"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>
                      {c.conflicting_aspect}
                    </span>
                    <Badge variant={c.severity === "high" ? "danger" : "warning"} className="text-[10px]">
                      {c.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Source A asserts: "{c.claim_a.claim_text}" vs Source B: "{c.claim_b.claim_text}"
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Section 2: Inquire on Information Gaps */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-amber-500" />
            <span>2. Information Gaps Requiring Vendor Clarification</span>
          </h2>
          <Badge variant="outline">{gaps?.length || 0} Items</Badge>
        </div>

        <div className="space-y-2">
          {gaps?.map((g) => {
            const key = `gap-${g.requirement_id}`
            const isDone = !!checkedItems[key]

            return (
              <label
                key={g.requirement_id}
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleCheck(key)}
                  className="mt-1 rounded text-brand focus:ring-brand"
                />
                <div className="space-y-1">
                  <span className={`text-xs font-semibold ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {g.requirement_text}
                  </span>
                  <p className="text-xs text-slate-500">
                    Recommended inquiry: {g.suggested_action}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Section 3: Review BlindSpots */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>3. BlindSpot Questions Requiring Stakeholder Alignment</span>
          </h2>
          <Badge variant="outline">{blindspots?.length || 0} Items</Badge>
        </div>

        <div className="space-y-2">
          {blindspots?.map((b) => {
            const key = `blindspot-${b.id}`
            const isDone = !!checkedItems[key]

            return (
              <label
                key={b.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleCheck(key)}
                  className="mt-1 rounded text-brand focus:ring-brand"
                />
                <div className="space-y-1">
                  <span className={`text-xs font-semibold ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {b.question}
                  </span>
                  <p className="text-xs text-slate-500">
                    Operational Risk: {b.rationale}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Export Action */}
      <div className="flex items-center justify-end pt-2">
        <Link to={`/report/${id}`}>
          <Button size="lg" variant="primary" className="gap-2">
            <span>Proceed to Executive Briefing Dossier</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
