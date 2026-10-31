import React, { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ListOrdered,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  Trash2,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Award,
  GraduationCap,
  Briefcase,
  Landmark,
  Layers,
  HelpCircle,
} from "lucide-react"
import { planService } from "@/services/planService"
import { researchService } from "@/services/researchService"
import { RequirementItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddRequirementModal } from "@/components/research/AddRequirementModal"
import { EditRequirementModal } from "@/components/research/EditRequirementModal"
import { cn } from "@/utils/cn"
import { DEMO_SESSION_ID, SAMPLE_SESSION_DETAIL, SAMPLE_REQUIREMENTS } from "@/utils/sampleData"

export const ResearchPlanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"all" | "official" | "suggested" | "critical">("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<RequirementItem | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Query Research Session
  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          return await researchService.getSession(id!)
        } catch {
          return SAMPLE_SESSION_DETAIL
        }
      }
      return researchService.getSession(id!)
    },
    enabled: !!id,
  })

  // Query Research Plan
  const { data: plan, isLoading, error: planError } = useQuery({
    queryKey: ["researchPlan", id],
    queryFn: async () => {
      if (id === "demo" || id === DEMO_SESSION_ID) {
        try {
          return await planService.getPlan(id!)
        } catch {
          return {
            session_id: DEMO_SESSION_ID,
            total_requirements: SAMPLE_REQUIREMENTS.length,
            official_approved_count: SAMPLE_REQUIREMENTS.length,
            ai_suggested_count: 0,
            decision_critical_count: 4,
            categories: ["academic", "eligibility", "financial", "documentation", "insurance"],
            requirements: SAMPLE_REQUIREMENTS,
          }
        }
      }
      return planService.getPlan(id!)
    },
    enabled: !!id,
  })

  // Generate Plan Mutation
  const generateMutation = useMutation({
    mutationFn: (domainContext?: string) =>
      planService.generatePlan(id!, { domain_context: domainContext, max_criteria: 9 }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["researchPlan", id] })
      queryClient.invalidateQueries({ queryKey: ["requirements", id] })
      setActionMessage({
        type: "success",
        text: `Generated ${data.ai_suggested_count} AI research requirements with Gemini API.`,
      })
      setTimeout(() => setActionMessage(null), 5000)
    },
    onError: (err: any) => {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to generate research plan.",
      })
    },
  })

  // Approve Plan Mutation
  const approveMutation = useMutation({
    mutationFn: (reqIds?: string[]) =>
      planService.approvePlan(id!, { approved_requirement_ids: reqIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researchPlan", id] })
      queryClient.invalidateQueries({ queryKey: ["requirements", id] })
      setActionMessage({
        type: "success",
        text: "Requirements approved and added to official investigation specification.",
      })
      setTimeout(() => setActionMessage(null), 5000)
    },
  })

  // Add Requirement Mutation
  const addMutation = useMutation({
    mutationFn: (newReq: Partial<RequirementItem>) => planService.addRequirement(id!, newReq),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researchPlan", id] })
      queryClient.invalidateQueries({ queryKey: ["requirements", id] })
    },
  })

  // Update Requirement Mutation
  const updateMutation = useMutation({
    mutationFn: ({ reqId, data }: { reqId: string; data: Partial<RequirementItem> }) =>
      planService.updateRequirement(reqId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researchPlan", id] })
      queryClient.invalidateQueries({ queryKey: ["requirements", id] })
    },
  })

  // Delete Requirement Mutation
  const deleteMutation = useMutation({
    mutationFn: (reqId: string) => planService.deleteRequirement(reqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researchPlan", id] })
      queryClient.invalidateQueries({ queryKey: ["requirements", id] })
    },
  })

  const requirements = plan?.requirements || []

  // Filter Requirements
  const filteredRequirements = requirements.filter((r) => {
    // Tab filter
    if (activeTab === "official" && !r.is_approved) return false
    if (activeTab === "suggested" && r.is_approved) return false
    if (activeTab === "critical" && !r.is_decision_critical) return false

    // Category filter
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const textMatch = (r.question || "").toLowerCase().includes(q) || r.requirement_text.toLowerCase().includes(q)
      const descMatch = (r.description || "").toLowerCase().includes(q)
      const catMatch = r.category.toLowerCase().includes(q)
      if (!textMatch && !descMatch && !catMatch) return false
    }

    return true
  })

  const officialReqs = filteredRequirements.filter((r) => r.is_approved)
  const suggestedReqs = filteredRequirements.filter((r) => !r.is_approved)

  const handleToggleCritical = (req: RequirementItem) => {
    updateMutation.mutate({
      reqId: req.id,
      data: { is_decision_critical: !req.is_decision_critical },
    })
  }

  const handleApproveSingle = (reqId: string) => {
    approveMutation.mutate([reqId])
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-800">
              Overview
            </Link>
            <span className="text-slate-300">/</span>
            <Link to={`/investigation/${id}`} className="text-slate-500 hover:text-slate-800">
              Investigation
            </Link>
            <span className="text-ink-muted">/</span>
            <span className="font-semibold text-ink">Intelligent Research Planner</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary text-white">
              <ListOrdered className="w-5 h-5" />
            </div>
            <span>Intelligent Research Planner</span>
          </h1>

          <p className="text-xs text-ink-secondary mt-1 max-w-2xl leading-relaxed">
            Decompose broad research goals into structured, independently verifiable research
            requirements. Review, customize, and approve requirements prior to forensic analysis.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-surface"
          >
            <Plus className="w-3.5 h-3.5 text-ink-muted" />
            <span>Add Custom Question</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 text-xs shadow-subtle"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Generate Plan (Gemini AI)</span>
          </Button>

          {suggestedReqs.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold text-status-success border border-status-success-border bg-status-success-bg hover:bg-emerald-100"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
              <span>Approve All ({plan?.ai_suggested_count || 0})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={cn(
            "p-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all",
            actionMessage.type === "success"
              ? "bg-status-success-bg border-status-success-border text-status-success"
              : "bg-status-danger-bg border-status-danger-border text-status-danger"
          )}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-status-danger shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[11px] font-semibold text-ink-secondary hover:text-ink underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scenario Presets Quick-Bar */}
      <div className="bg-background-subtle p-4 rounded-xl border border-border space-y-2.5">
        <div className="flex items-center justify-between text-xs text-ink-secondary">
          <span className="font-bold text-ink uppercase tracking-wider text-[10px]">
            Decompose By Domain Preset:
          </span>
          <span className="text-[11px] text-ink-muted">
            Click to auto-generate comprehensive domain criteria via Gemini API
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <button
            onClick={() => generateMutation.mutate("scholarship")}
            disabled={generateMutation.isPending}
            className="p-3 rounded-lg border border-border bg-surface hover:border-secondary hover:shadow-subtle transition-all text-left flex items-start gap-2.5"
          >
            <div className="p-1.5 rounded-md bg-secondary-light text-secondary shrink-0 mt-0.5">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-ink">Government Scholarship</div>
              <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">
                Eligibility, Academics, Income ceilings, Documents, Deadlines, Renewal & Exceptions.
              </p>
            </div>
          </button>

          <button
            onClick={() => generateMutation.mutate("business")}
            disabled={generateMutation.isPending}
            className="p-3 rounded-lg border border-border bg-surface hover:border-secondary hover:shadow-subtle transition-all text-left flex items-start gap-2.5"
          >
            <div className="p-1.5 rounded-md bg-secondary-light text-secondary shrink-0 mt-0.5">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-ink">Business Research</div>
              <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">
                TAM sizing, Unit Economics, LTV/CAC, Regulatory moats, Customer channels & Risks.
              </p>
            </div>
          </button>

          <button
            onClick={() => generateMutation.mutate("government_service")}
            disabled={generateMutation.isPending}
            className="p-3 rounded-lg border border-border bg-surface hover:border-secondary hover:shadow-subtle transition-all text-left flex items-start gap-2.5"
          >
            <div className="p-1.5 rounded-md bg-secondary-light text-secondary shrink-0 mt-0.5">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-ink">Government Service</div>
              <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">
                Statutory entitlement, Identity proofs, Processing SLAs, Appeal rights & Compliance.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-surface shadow-card">
          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">
            Total Evaluation Criteria
          </div>
          <div className="text-xl font-extrabold text-ink mt-0.5">
            {plan?.total_requirements || 0}
          </div>
          <span className="text-[10px] text-ink-muted">Decomposed research dimensions</span>
        </div>

        <div className="p-3.5 rounded-xl border border-status-success-border bg-status-success-bg/40 shadow-card">
          <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Official Approved
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-0.5">
            {plan?.official_approved_count || 0}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Included in investigation scope</span>
        </div>

        <div className="p-3.5 rounded-xl border border-secondary/20 bg-secondary-light/40 shadow-card">
          <div className="text-[10px] uppercase font-bold text-secondary tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            AI Suggestions
          </div>
          <div className="text-xl font-extrabold text-ink mt-0.5">
            {plan?.ai_suggested_count || 0}
          </div>
          <span className="text-[10px] text-ink-secondary font-medium">Awaiting review & approval</span>
        </div>

        <div className="p-3.5 rounded-xl border border-status-danger-border bg-status-danger-bg/40 shadow-card">
          <div className="text-[10px] uppercase font-bold text-status-danger tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-status-danger" />
            Decision-Critical
          </div>
          <div className="text-xl font-extrabold text-status-danger mt-0.5">
            {plan?.decision_critical_count || 0}
          </div>
          <span className="text-[10px] text-status-danger font-medium">Dealbreaker gatekeepers (P0)</span>
        </div>
      </div>

      {/* Toolbar: Search & Tab Filters */}
      <div className="bg-surface p-3.5 rounded-xl border border-border shadow-card flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or criteria..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background/50 border border-border rounded-lg text-ink focus:bg-surface focus:outline-hidden focus:ring-1 focus:ring-secondary"
          />
        </div>

        {/* Middle: Tab Pills */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-all",
              activeTab === "all"
                ? "bg-primary text-white shadow-subtle"
                : "text-ink-secondary hover:bg-background hover:text-ink"
            )}
          >
            All ({requirements.length})
          </button>
          <button
            onClick={() => setActiveTab("official")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1",
              activeTab === "official"
                ? "bg-status-success text-white shadow-subtle"
                : "text-ink-secondary hover:bg-background hover:text-ink"
            )}
          >
            <span>Official Approved</span>
            <span className="text-[10px] font-mono opacity-80">
              ({plan?.official_approved_count || 0})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("suggested")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1",
              activeTab === "suggested"
                ? "bg-secondary text-white shadow-subtle"
                : "text-ink-secondary hover:bg-background hover:text-ink"
            )}
          >
            <span>AI Suggestions</span>
            <span className="text-[10px] font-mono opacity-80">
              ({plan?.ai_suggested_count || 0})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("critical")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1",
              activeTab === "critical"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <span>Critical (P0)</span>
            <span className="text-[10px] font-mono opacity-80">
              ({plan?.decision_critical_count || 0})
            </span>
          </button>
        </div>

        {/* Right: Category filter */}
        {plan?.categories && plan.categories.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Categories ({plan.categories.length})</option>
              {plan.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content Section: Requirements List */}
      {isLoading ? (
        <div className="p-16 border rounded-xl bg-white text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            Loading research plan and decomposing criteria...
          </p>
        </div>
      ) : requirements.length === 0 ? (
        <div className="p-16 border rounded-xl bg-white text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Research Requirements Defined Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Generate an intelligent research plan with Gemini AI to convert this investigation goal
            into structured, verifiable questions, or add custom questions manually.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-blue-600 text-white"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <span>Decompose Goal With AI</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add Custom Question</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: OFFICIAL REQUIREMENTS */}
          {officialReqs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Official Investigation Requirements ({officialReqs.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  Approved criteria active for evidence mapping and contradiction analysis
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {officialReqs.map((req) => (
                  <RequirementCard
                    key={req.id}
                    requirement={req}
                    onEdit={() => setEditingRequirement(req)}
                    onDelete={() => deleteMutation.mutate(req.id)}
                    onToggleCritical={() => handleToggleCritical(req)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: AI-SUGGESTED QUESTIONS (NEVER PRESENTED AS OFFICIAL UNTIL APPROVED) */}
          {suggestedReqs.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-950 tracking-tight">
                      AI-Suggested Research Criteria ({suggestedReqs.length} Pending Approval)
                    </h4>
                    <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                      <strong>Policy Notice:</strong> AI-generated suggestions are recommendations and
                      are <em>never</em> treated as official requirements until you review and approve them.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="bg-[#23865B] hover:bg-emerald-700 text-white shrink-0 text-xs shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Approve All Suggested</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {suggestedReqs.map((req) => (
                  <RequirementCard
                    key={req.id}
                    requirement={req}
                    onEdit={() => setEditingRequirement(req)}
                    onDelete={() => deleteMutation.mutate(req.id)}
                    onToggleCritical={() => handleToggleCritical(req)}
                    onApprove={() => handleApproveSingle(req.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddRequirementModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={async (data) => {
          await addMutation.mutateAsync(data)
        }}
        existingCategories={plan?.categories}
      />

      <EditRequirementModal
        isOpen={!!editingRequirement}
        requirement={editingRequirement}
        onClose={() => setEditingRequirement(null)}
        onSave={async (reqId, data) => {
          await updateMutation.mutateAsync({ reqId, data })
        }}
        existingCategories={plan?.categories}
      />
    </div>
  )
}

interface RequirementCardProps {
  requirement: RequirementItem
  onEdit: () => void
  onDelete: () => void
  onToggleCritical: () => void
  onApprove?: () => void
}

const RequirementCard: React.FC<RequirementCardProps> = ({
  requirement,
  onEdit,
  onDelete,
  onToggleCritical,
  onApprove,
}) => {
  const isApproved = requirement.is_approved
  const isCritical = requirement.is_decision_critical

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-white shadow-xs transition-all duration-200 hover:shadow-md space-y-3",
        isApproved
          ? isCritical
            ? "border-rose-300 ring-1 ring-rose-200/60"
            : "border-slate-200 hover:border-slate-300"
          : "border-blue-200 bg-blue-50/20 hover:border-blue-300"
      )}
    >
      {/* Top Meta Line */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          {isApproved ? (
            <Badge variant="success" className="text-[10px]">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Official Requirement</span>
            </Badge>
          ) : (
            <Badge variant="default" className="bg-blue-600 text-white text-[10px]">
              <Sparkles className="w-3 h-3 text-blue-200" />
              <span>AI Suggestion</span>
            </Badge>
          )}

          {/* Category */}
          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {requirement.category}
          </span>

          {/* Priority */}
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded border",
              requirement.priority === "P0"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            )}
          >
            {requirement.priority || "P1"}
          </span>

          {/* Importance */}
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            {requirement.importance || "high"}
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Decision-Critical Toggle */}
          <button
            onClick={onToggleCritical}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors",
              isCritical
                ? "bg-rose-50 text-rose-700 border-rose-200 shadow-xs"
                : "text-slate-400 border-transparent hover:text-slate-700 hover:bg-slate-100"
            )}
            title="Toggle Decision-Critical Gatekeeper"
          >
            <ShieldAlert className={cn("w-3.5 h-3.5", isCritical ? "text-rose-600" : "text-slate-400")} />
            <span>{isCritical ? "Dealbreaker (P0)" : "Mark Dealbreaker"}</span>
          </button>

          {/* Approve Single */}
          {onApprove && !isApproved && (
            <button
              onClick={onApprove}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors shadow-xs"
              title="Promote to official requirement"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Approve</span>
            </button>
          )}

          {/* Edit */}
          <button
            onClick={onEdit}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit question"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Question Heading */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 leading-snug">
          {requirement.question || requirement.requirement_text}
        </h4>
        {requirement.requirement_text && requirement.requirement_text !== requirement.question && (
          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
            {requirement.requirement_text}
          </p>
        )}
      </div>

      {/* Description / Purpose */}
      {requirement.description && (
        <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/60 p-2 rounded-lg border border-slate-100">
          {requirement.description}
        </p>
      )}

      {/* Bottom Provenance Strip */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono">ID: {requirement.id}</span>
        <div className="flex items-center gap-3">
          <span>Weight: {requirement.weight || 1.0}x</span>
          <span>Status: {requirement.status || "uncovered"}</span>
        </div>
      </div>
    </div>
  )
}
