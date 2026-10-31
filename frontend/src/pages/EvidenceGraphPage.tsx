import React from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { GitBranch, Info, AlertTriangle, ShieldCheck } from "lucide-react"
import { findingService } from "@/services/findingService"
import { ReactFlowCanvas } from "@/components/graph/ReactFlowCanvas"
import { Badge } from "@/components/ui/badge"

export const EvidenceGraphPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: graphData, isLoading } = useQuery({
    queryKey: ["graph", id],
    queryFn: () => findingService.getEvidenceGraph(id!),
    enabled: !!id,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-brand" />
            <span>Interactive Evidence & Conflict Graph</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual map connecting goals, requirements, atomic claims, and cross-source contradictions.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-navy-900 inline-block" />
            <span>Goal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-slate-400 inline-block" />
            <span>Requirement</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-emerald-500 inline-block" />
            <span>Claim</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-600 inline-block" />
            <span className="text-rose-600 font-semibold">Contradiction</span>
          </div>
        </div>
      </div>

      {/* React Flow Graph */}
      {isLoading ? (
        <div className="h-[600px] flex items-center justify-center border rounded-xl bg-white text-xs text-slate-500">
          Rendering interactive evidence graph...
        </div>
      ) : graphData && graphData.nodes.length > 0 ? (
        <ReactFlowCanvas nodes={graphData.nodes} edges={graphData.edges} />
      ) : (
        <div className="p-12 text-center border rounded-xl bg-white text-xs text-slate-500">
          No graph data available. Run investigation to map evidence.
        </div>
      )}
    </div>
  )
}
