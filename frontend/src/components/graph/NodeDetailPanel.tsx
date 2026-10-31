import React from "react"
import {
  X,
  ExternalLink,
  Target,
  CheckSquare,
  FileText,
  Layers,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Quote,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  ShieldCheck,
  Percent,
} from "lucide-react"
import { FlowNode } from "@/types"
import { Badge } from "@/components/ui/badge"

interface NodeDetailPanelProps {
  node: FlowNode | null
  onClose: () => void
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose }) => {
  if (!node) return null

  const { data } = node
  const nodeType = data.node_type
  const meta = (data.meta as Record<string, any>) || {}

  const getNodeHeader = () => {
    switch (nodeType) {
      case "goal":
        return {
          title: "Research Goal",
          badge: "Root Scope",
          badgeVariant: "default" as const,
          icon: Target,
          color: "text-blue-600 bg-blue-50 border-blue-200",
        }
      case "requirement":
        return {
          title: "Requirement Criterion",
          badge: meta.category || "Evaluation",
          badgeVariant: "secondary" as const,
          icon: CheckSquare,
          color: "text-slate-700 bg-slate-100 border-slate-200",
        }
      case "claim":
        return {
          title: "Atomic Claim",
          badge: meta.claim_type || "Assertion",
          badgeVariant: "outline" as const,
          icon: FileText,
          color: "text-blue-700 bg-blue-50 border-blue-200",
        }
      case "evidence":
        return {
          title: "Evidence Passage",
          badge: meta.location || "Passage",
          badgeVariant: "outline" as const,
          icon: Layers,
          color: "text-cyan-700 bg-cyan-50 border-cyan-200",
        }
      case "source":
        return {
          title: "Source Document",
          badge: (meta.source_type || "Document").toUpperCase(),
          badgeVariant: "secondary" as const,
          icon: BookOpen,
          color: "text-slate-800 bg-slate-100 border-slate-200",
        }
      case "gap":
        return {
          title: "Information Gap",
          badge: data.severity === "high" ? "High Priority" : "Medium",
          badgeVariant: "warning" as const,
          icon: AlertTriangle,
          color: "text-amber-800 bg-amber-50 border-amber-200",
        }
      case "contradiction":
        return {
          title: "Cross-Source Contradiction",
          badge: (data.severity || "Critical").toUpperCase(),
          badgeVariant: "danger" as const,
          icon: ShieldAlert,
          color: "text-rose-800 bg-rose-50 border-rose-200",
        }
      case "blindspot":
        return {
          title: "BlindSpot Discovery",
          badge: meta.risk_level ? `${meta.risk_level.toUpperCase()} RISK` : "INQUIRY",
          badgeVariant: "default" as const,
          icon: Sparkles,
          color: "text-indigo-800 bg-indigo-50 border-indigo-200",
        }
      default:
        return {
          title: "Knowledge Entity",
          badge: "Node",
          badgeVariant: "outline" as const,
          icon: Target,
          color: "text-slate-700 bg-slate-100 border-slate-200",
        }
    }
  }

  const header = getNodeHeader()
  const HeaderIcon = header.icon

  return (
    <div className="w-[420px] max-w-full bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20 transition-all duration-300">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${header.color}`}>
            <HeaderIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">{header.title}</h3>
            <span className="text-[10px] text-slate-500 font-mono">ID: {node.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={header.badgeVariant}>{header.badge}</Badge>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700">
        {/* Node Label / Title */}
        <div>
          <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
            Entity Label
          </label>
          <h4 className="text-sm font-semibold text-slate-900 leading-snug">{data.label}</h4>
        </div>

        {/* -------------------------------------------------------------
            1. SOURCE NODE DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "source" && (
          <div className="space-y-4">
            {/* Original Link / URI */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Original Link & Location
              </label>
              {data.url || meta.uri ? (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-700 truncate">{data.url || meta.uri}</span>
                  {(data.url || meta.uri).startsWith("http") && (
                    <a
                      href={data.url || meta.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Open external link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 italic">
                  Local document upload without public URL
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                <span className="text-[10px] text-slate-400 block mb-0.5">Author / Publisher</span>
                <div className="flex items-center gap-1 font-medium text-slate-800">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{meta.author || "Unknown"}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                <span className="text-[10px] text-slate-400 block mb-0.5">Publication Date</span>
                <div className="flex items-center gap-1 font-medium text-slate-800">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{meta.publication_date || "Undated"}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                <span className="text-[10px] text-slate-400 block mb-0.5">Extracted Chunks</span>
                <span className="font-bold text-slate-800">{meta.chunk_count || 1} Chunks</span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                <span className="text-[10px] text-slate-400 block mb-0.5">Reliability Score</span>
                <div className="flex items-center gap-1 font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{((meta.reliability_score || 0.95) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            2. EVIDENCE NODE DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "evidence" && (
          <div className="space-y-4">
            {/* Location & Provenance */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Document Location
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-50/60 border border-cyan-100 text-cyan-900 font-medium text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>{meta.location || `Page ${data.page || 1}`}</span>
                {meta.chunk_id && (
                  <span className="ml-auto text-[10px] font-mono text-cyan-600 bg-cyan-100/60 px-1.5 py-0.5 rounded">
                    Chunk: {meta.chunk_id}
                  </span>
                )}
              </div>
            </div>

            {/* Verbatim Quote */}
            {data.quote && (
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                  Verbatim Quote Substring
                </label>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium italic leading-relaxed">
                  <Quote className="w-3 h-3 text-slate-400 mb-1" />
                  "{data.quote}"
                </div>
              </div>
            )}

            {/* Original Passage Excerpt */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Full Passage Context
              </label>
              <div className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                {meta.passage || data.quote || "Passage content parsed from document."}
              </div>
            </div>

            {meta.source_title && (
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Extracted from source:</span>
                <span className="font-semibold text-slate-700">{meta.source_title}</span>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            3. INFORMATION GAP DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "gap" && (
          <div className="space-y-4">
            {/* Missing Information Explanation */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-amber-700 block mb-1">
                What Is Missing
              </label>
              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-950 font-medium leading-relaxed">
                {meta.missing_explanation || "No source documents verify this requirement."}
              </div>
            </div>

            {/* Related Requirement */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Related Requirement Criterion
              </label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-snug">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  {meta.category || "Evaluation"}
                </div>
                {meta.related_requirement_text || data.label}
              </div>
            </div>

            {/* Suggested Action */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Recommended Verification Action
              </label>
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-900 leading-relaxed text-[11px]">
                {meta.suggested_action ||
                  "Ingest specialized benchmark documentation or request engineering sign-off."}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            4. CONTRADICTION DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "contradiction" && (
          <div className="space-y-4">
            {/* Conflicting Aspect */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-rose-700 block mb-1">
                Conflicting Aspect
              </label>
              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-950 font-medium leading-relaxed">
                {meta.conflicting_aspect || data.label}
              </div>
            </div>

            {/* Side-by-side or stacked Conflicting Claims */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block">
                Discrepancy Comparison
              </label>

              {/* Claim A */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-800">
                  <span>CLAIM A</span>
                  <span className="text-slate-500 font-medium truncate max-w-[150px]">
                    {meta.claim_a_source || "Source A"}
                  </span>
                </div>
                <p className="text-slate-800 font-medium">{meta.claim_a_text || "Asserted claim A"}</p>
                {meta.claim_a_quote && (
                  <p className="text-[10.5px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                    "{meta.claim_a_quote}"
                  </p>
                )}
              </div>

              {/* Claim B */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-rose-800">
                  <span>CLAIM B</span>
                  <span className="text-slate-500 font-medium truncate max-w-[150px]">
                    {meta.claim_b_source || "Source B"}
                  </span>
                </div>
                <p className="text-slate-800 font-medium">{meta.claim_b_text || "Asserted claim B"}</p>
                {meta.claim_b_quote && (
                  <p className="text-[10.5px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                    "{meta.claim_b_quote}"
                  </p>
                )}
              </div>
            </div>

            {/* Synthesis Verdict */}
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Automated Synthesis Verdict
              </label>
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 leading-relaxed text-[11px]">
                {meta.synthesis_verdict || "Unresolved empirical discrepancy requires manual verification."}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            5. CLAIM DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "claim" && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Full Claim Statement
              </label>
              <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium leading-relaxed">
                {meta.full_claim || data.label}
              </p>
            </div>

            {data.quote && (
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                  Verbatim Document Quote
                </label>
                <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-100 text-blue-950 font-serif italic text-xs leading-relaxed">
                  "{data.quote}"
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Confidence Score</span>
                <span className="font-bold text-slate-800">
                  {meta.confidence_score ? `${(meta.confidence_score * 100).toFixed(0)}%` : "High"}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Date Reference</span>
                <span className="font-medium text-slate-800">{meta.date_reference || "Current"}</span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            6. REQUIREMENT DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "requirement" && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Full Requirement Statement
              </label>
              <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium leading-relaxed">
                {meta.full_text || data.label}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Category</span>
                <span className="font-bold text-slate-800">{meta.category || "General"}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Relative Weight</span>
                <span className="font-bold text-slate-800">{meta.weight || 1.0}x Importance</span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            7. RESEARCH GOAL DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "goal" && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                Research Goal
              </label>
              <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium leading-relaxed">
                {meta.research_goal || data.label}
              </p>
            </div>

            {meta.target_decision && (
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                  Target Decision
                </label>
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-900 leading-relaxed">
                  {meta.target_decision}
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-900 text-white space-y-1">
              <span className="text-[10px] text-blue-200 font-semibold tracking-wider uppercase block">
                Overall Decision Readiness Index
              </span>
              <div className="text-2xl font-bold tracking-tight">
                {meta.readiness_score ? `${Number(meta.readiness_score).toFixed(1)}%` : "N/A"}
              </div>
              {meta.executive_verdict && (
                <p className="text-[11px] text-slate-300 pt-1 border-t border-slate-800 leading-relaxed">
                  {meta.executive_verdict}
                </p>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            8. BLINDSPOT DETAILS
        ------------------------------------------------------------- */}
        {nodeType === "blindspot" && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-indigo-700 block mb-1">
                Unasked Inquiry Question
              </label>
              <p className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-950 font-medium text-xs leading-relaxed">
                {meta.question || data.label}
              </p>
            </div>

            {meta.rationale && (
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                  Strategic Rationale
                </label>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed text-[11px]">
                  {meta.rationale}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Risk Level</span>
                <span className="font-bold text-rose-700 uppercase">{meta.risk_level || "Medium"}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Inquiry Category</span>
                <span className="font-bold text-slate-800">{meta.category || "Strategic"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
