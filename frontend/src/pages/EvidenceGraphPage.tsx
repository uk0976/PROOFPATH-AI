import React from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  GitBranch,
  Target,
  CheckSquare,
  FileText,
  Layers,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  Award,
} from "lucide-react"
import { findingService } from "@/services/findingService"
import { researchService } from "@/services/researchService"
import { ReactFlowCanvas } from "@/components/graph/ReactFlowCanvas"
import { Badge } from "@/components/ui/badge"

export const EvidenceGraphPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: research } = useQuery({
    queryKey: ["research", id],
    queryFn: () => researchService.getSession(id!),
    enabled: !!id,
  })

  const { data: graphData, isLoading } = useQuery({
    queryKey: ["graph", id],
    queryFn: () => findingService.getEvidenceGraph(id!),
    enabled: !!id,
  })

  // Quick stats
  const stats = React.useMemo(() => {
    if (!graphData) return null
    const counts = {
      total: graphData.nodes.length,
      requirements: graphData.nodes.filter((n) => n.data.node_type === "requirement").length,
      claims: graphData.nodes.filter((n) => n.data.node_type === "claim").length,
      evidence: graphData.nodes.filter((n) => n.data.node_type === "evidence").length,
      sources: graphData.nodes.filter((n) => n.data.node_type === "source").length,
      conflicts: graphData.nodes.filter((n) => n.data.node_type === "contradiction").length,
      gaps: graphData.nodes.filter((n) => n.data.node_type === "gap").length,
      blindspots: graphData.nodes.filter((n) => n.data.node_type === "blindspot").length,
    }
    return counts
  }, [graphData])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={id ? `/research/${id}` : "/dashboard"}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Investigation
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-900">Evidence Knowledge Graph</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#172B45] text-white">
              <GitBranch className="w-5 h-5" />
            </div>
            <span>{research?.title || "Evidence Knowledge Graph"}</span>
          </h1>

          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Interactive multi-layered knowledge graph connecting research goals, requirements, atomic
            claims, passage excerpts, primary sources, information gaps, and cross-source contradictions.
          </p>
        </div>

        {/* Quick Decision Readiness Badge */}
        {research && research.readiness_score !== undefined && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs self-start md:self-auto">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Decision Readiness Index
              </div>
              <div className="text-base font-extrabold text-slate-900 tracking-tight">
                {research.readiness_score.toFixed(1)}%
                <span className="text-xs font-semibold text-slate-500 ml-1.5 font-sans">
                  ({research.status})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats & Legend Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        {/* Node Categories Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mr-1">
            Legend:
          </span>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#172B45]" />
            <span className="font-medium text-slate-700">Goal</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
            <span className="font-medium text-slate-700">Requirement</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
            <span className="font-medium text-slate-700">Claim</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600" />
            <span className="font-medium text-slate-700">Evidence</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
            <span className="font-medium text-slate-700">Source</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span className="font-medium text-amber-700 font-semibold">Gap</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" />
            <span className="font-medium text-rose-700 font-semibold">Conflict</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
            <span className="font-medium text-indigo-700 font-semibold">Blindspot</span>
          </div>
        </div>

        {/* Quick Instructions Hint */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Click any node to inspect passages, metadata, and conflicting claims.</span>
        </div>
      </div>

      {/* React Flow Knowledge Graph */}
      {isLoading ? (
        <div className="h-[760px] flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-white text-xs text-slate-500 space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-slate-700">
            Synthesizing multi-source knowledge graph...
          </span>
          <span className="text-[11px] text-slate-400">
            Mapping atomic claims, evidence passages, contradictions, and information gaps.
          </span>
        </div>
      ) : graphData && graphData.nodes.length > 0 ? (
        <ReactFlowCanvas nodes={graphData.nodes} edges={graphData.edges} />
      ) : (
        <div className="p-16 text-center border border-slate-200 rounded-xl bg-white space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <GitBranch className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Knowledge Graph Data Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Attach source documents and run the investigation pipeline to generate the multi-layered
            evidence knowledge graph.
          </p>
          {id && (
            <Link
              to={`/research/${id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              <span>Go to Investigation Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
