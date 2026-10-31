import React, { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CheckSquare,
  Square,
  AlertTriangle,
  FileCheck2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  Filter,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  X,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react"
import {
  reportService,
  VerificationTaskItem,
  VerificationTaskCreatePayload,
  EvidenceSnippet,
} from "@/services/reportService"
import { researchService } from "@/services/researchService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SAMPLE_VERIFICATION_TASKS } from "@/utils/sampleData"

export const VerificationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  // State
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [selectedEvidenceTask, setSelectedEvidenceTask] = useState<VerificationTaskItem | null>(null)

  // Custom task form state
  const [newTitle, setNewTitle] = useState<string>("")
  const [newDescription, setNewDescription] = useState<string>("")
  const [newPriority, setNewPriority] = useState<string>("high")
  const [newTaskType, setNewTaskType] = useState<string>("verify_missing_information")
  const [newRequirementText, setNewRequirementText] = useState<string>("")
  const [newRecommendedAction, setNewRecommendedAction] = useState<string>("")

  // Fetch session
  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: () => {
      if (!id || id === "demo") return null
      return researchService.getSession(id)
    },
    enabled: !!id,
  })

  // Fetch tasks
  const { data: tasks, isLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["verification", id],
    queryFn: async () => {
      if (!id || id === "demo") return SAMPLE_VERIFICATION_TASKS
      return await reportService.getVerification(id)
    },
    enabled: !!id,
  })

  // Toggle task mutation (optimistic update)
  const toggleMutation = useMutation({
    mutationFn: async (task: VerificationTaskItem) => {
      if (id === "demo") return { ...task, is_completed: !task.is_completed }
      return await reportService.toggleVerification(task.id)
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ["verification", id] })
      const prev = queryClient.getQueryData<VerificationTaskItem[]>(["verification", id])
      if (prev) {
        queryClient.setQueryData<VerificationTaskItem[]>(
          ["verification", id],
          prev.map((t) => (t.id === task.id ? { ...t, is_completed: !t.is_completed } : t))
        )
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["verification", id], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["verification", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
    },
  })

  // Create custom task mutation
  const createMutation = useMutation({
    mutationFn: async (payload: VerificationTaskCreatePayload) => {
      if (!id || id === "demo") return
      return await reportService.createCustomVerificationTask(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification", id] })
      setShowAddModal(false)
      resetForm()
    },
  })

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!id || id === "demo") return
      return await reportService.deleteVerification(taskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification", id] })
    },
  })

  // Regenerate tasks mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === "demo") return
      return await reportService.regenerateVerificationTasks(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification", id] })
    },
  })

  const resetForm = () => {
    setNewTitle("")
    setNewDescription("")
    setNewPriority("high")
    setNewTaskType("verify_missing_information")
    setNewRequirementText("")
    setNewRecommendedAction("")
  }

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      priority: newPriority,
      task_type: newTaskType,
      related_requirement_text: newRequirementText.trim() || undefined,
      recommended_action: newRecommendedAction.trim() || undefined,
    })
  }

  const allTasks: VerificationTaskItem[] = tasks || []
  const completedCount = allTasks.filter((t) => t.is_completed).length
  const pendingCount = allTasks.length - completedCount
  const criticalCount = allTasks.filter((t) => (t.priority || "high").toLowerCase() === "critical").length

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      // Priority filter
      if (priorityFilter !== "ALL" && (t.priority || "high").toLowerCase() !== priorityFilter.toLowerCase()) {
        return false
      }
      // Status filter
      if (statusFilter === "PENDING" && t.is_completed) return false
      if (statusFilter === "COMPLETED" && !t.is_completed) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (t.title || "").toLowerCase().includes(q)
        const matchDesc = (t.description || "").toLowerCase().includes(q)
        const matchReq = (t.related_requirement_text || "").toLowerCase().includes(q)
        const matchAction = (t.recommended_action || "").toLowerCase().includes(q)
        return matchTitle || matchDesc || matchReq || matchAction
      }
      return true
    })
  }, [allTasks, priorityFilter, statusFilter, searchQuery])

  // Helper formatting for task type labels
  const formatTaskType = (type: string) => {
    switch (type) {
      case "verify_missing_information":
        return { label: "Verify Missing Information", color: "border-rose-200 bg-rose-50 text-status-danger" }
      case "resolve_incomplete_requirements":
        return { label: "Resolve Incomplete Requirement", color: "border-amber-200 bg-amber-50 text-amber-700" }
      case "investigate_conflicting_claims":
        return { label: "Investigate Conflicting Claims", color: "border-rose-200 bg-rose-50 text-status-danger" }
      case "check_outdated_information":
        return { label: "Check Outdated Information", color: "border-orange-200 bg-orange-50 text-orange-700" }
      case "validate_unverified_claims":
        return { label: "Validate Unverified Claims", color: "border-purple-200 bg-purple-50 text-purple-700" }
      case "contradiction":
        return { label: "Arbitrate Contradiction", color: "border-rose-200 bg-rose-50 text-status-danger" }
      case "blindspot":
        return { label: "Omitted Risk Review", color: "border-blue-200 bg-blue-50 text-secondary" }
      default:
        return { label: "Custom Directive", color: "border-slate-200 bg-slate-50 text-ink-secondary" }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* =========================================================================
          1. HEADER & METRIC COUNTERS
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
              PRE-DECISION AUDIT
            </span>
            <Badge variant="outline" className="border-secondary/30 text-secondary font-mono text-[10px]">
              ACTIONABLE DIRECTIVES
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-secondary" />
            <span>Verification Planner & Action Checklist</span>
          </h1>
          <p className="text-xs text-ink-secondary">
            Resolve unverified claims, arbitrate cross-source clashes, and procure missing information prior to decision sign-off.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="gap-1.5 shadow-subtle"
            title="Resync verification tasks from latest findings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
            <span>Resync Directives</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Task</span>
          </Button>
        </div>
      </div>

      {/* Progress Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Total Tasks</span>
          <div className="text-2xl font-extrabold text-ink">{allTasks.length}</div>
          <span className="text-[10px] text-ink-muted">Mandatory & custom directives</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Completed</span>
          <div className="text-2xl font-extrabold text-status-success">{completedCount}</div>
          <span className="text-[10px] text-ink-muted">Verified & arbitrated</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Pending Action</span>
          <div className="text-2xl font-extrabold text-amber-700">{pendingCount}</div>
          <span className="text-[10px] text-ink-muted">Outstanding follow-ups</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface shadow-card space-y-1">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Critical Blockers</span>
          <div className="text-2xl font-extrabold text-status-danger">{criticalCount}</div>
          <span className="text-[10px] text-ink-muted">High decision-risk items</span>
        </div>
      </div>

      {/* =========================================================================
          2. FILTERS & SEARCH BAR
          ========================================================================= */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Priority Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-ink-muted mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Priority:
          </span>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((prio) => (
            <button
              key={prio}
              onClick={() => setPriorityFilter(prio)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                priorityFilter === prio
                  ? "bg-secondary text-white shadow-subtle"
                  : "bg-background text-ink-secondary hover:text-ink border border-border"
              }`}
            >
              {prio}
            </button>
          ))}
        </div>

        {/* Status Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
            {[
              { id: "ALL", label: "All Tasks" },
              { id: "PENDING", label: "Pending" },
              { id: "COMPLETED", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-surface text-ink font-semibold shadow-subtle"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. TASK CHECKLIST LISTING
          ========================================================================= */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-secondary animate-spin mx-auto" />
          <p className="text-xs text-ink-secondary font-medium">Loading verification directives...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center text-xs text-ink-secondary bg-surface rounded-xl border border-dashed border-border-strong space-y-2">
          <CheckCircle2 className="w-8 h-8 text-status-success mx-auto" />
          <h3 className="text-sm font-semibold text-ink">No tasks match the active filters</h3>
          <p className="text-[11px] text-ink-muted max-w-sm mx-auto">
            Try clearing the search query or switching to "All Tasks".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const typeInfo = formatTaskType(task.task_type)
            const prioUpper = (task.priority || "high").toUpperCase()
            const hasEvidence = task.evidence_references && task.evidence_references.length > 0

            return (
              <div
                key={task.id}
                className={`p-5 rounded-xl border transition-all space-y-3 ${
                  task.is_completed
                    ? "bg-surface/60 border-border opacity-75"
                    : "bg-surface border-border shadow-card hover:border-secondary/40"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(task)}
                      className="mt-0.5 text-ink-muted hover:text-secondary transition-colors shrink-0"
                      title={task.is_completed ? "Click to Reopen" : "Click to Mark Complete"}
                    >
                      {task.is_completed ? (
                        <CheckSquare className="w-5 h-5 text-status-success" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Task Type Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            prioUpper === "CRITICAL"
                              ? "bg-rose-50 text-status-danger border-rose-200"
                              : prioUpper === "HIGH"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {prioUpper} Priority
                        </span>

                        {task.is_custom && (
                          <Badge variant="secondary" className="text-[9px]">
                            CUSTOM DIRECTIVE
                          </Badge>
                        )}
                      </div>

                      {/* Task Title */}
                      <h3
                        className={`text-sm font-semibold leading-snug ${
                          task.is_completed ? "line-through text-ink-muted" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </h3>

                      {/* Related Requirement Context */}
                      {task.related_requirement_text && (
                        <p className="text-[11px] text-ink-muted">
                          <strong>Related Criterion:</strong> {task.related_requirement_text}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    {hasEvidence && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedEvidenceTask(task)}
                        className="text-xs gap-1"
                      >
                        <FileText className="w-3 h-3 text-secondary" />
                        <span>View Evidence ({task.evidence_references?.length})</span>
                      </Button>
                    )}

                    <Button
                      variant={task.is_completed ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => toggleMutation.mutate(task)}
                      className="text-xs"
                    >
                      {task.is_completed ? "Reopen" : "Mark Complete"}
                    </Button>

                    {task.is_custom && (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(task.id)}
                        className="text-ink-muted hover:text-status-danger p-1.5 transition-colors"
                        title="Delete custom task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Directive Description */}
                {task.description && (
                  <p className="text-xs text-ink-secondary leading-relaxed pl-8">
                    {task.description}
                  </p>
                )}

                {/* Recommended Action Box */}
                {task.recommended_action && (
                  <div className="ml-8 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider text-emerald-800">
                        Recommended Resolution Action:
                      </strong>
                      <span>{task.recommended_action}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          4. FOOTER ACTION: PROCEED TO REPORT
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
        <div className="text-xs text-ink-secondary">
          Completed {completedCount} of {allTasks.length} verification directives.
        </div>

        <Link to={`/report/${id}`}>
          <Button size="lg" variant="primary" className="gap-2 shadow-subtle">
            <span>Proceed to Downloadable Final Report</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* =========================================================================
          5. ADD CUSTOM TASK MODAL
          ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Plus className="w-4 h-4 text-secondary" />
                <span>Add Custom Verification Directive</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink-muted hover:text-ink p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-ink">Task Directive Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Confirm student housing stipend with financial aid office"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Directive Category</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                  >
                    <option value="verify_missing_information">Verify Missing Information</option>
                    <option value="resolve_incomplete_requirements">Resolve Incomplete Requirements</option>
                    <option value="investigate_conflicting_claims">Investigate Conflicting Claims</option>
                    <option value="check_outdated_information">Check Outdated Information</option>
                    <option value="validate_unverified_claims">Validate Unverified Claims</option>
                    <option value="custom">Custom Directive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Risk Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Related Requirement / Decision Criterion</label>
                <input
                  type="text"
                  placeholder="e.g. Housing and Board Allowance Eligibility"
                  value={newRequirementText}
                  onChange={(e) => setNewRequirementText(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Detailed Description</label>
                <textarea
                  rows={2}
                  placeholder="Context regarding why this verification step is required before proceeding..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Recommended Action</label>
                <input
                  type="text"
                  placeholder="e.g. Call admissions representative or submit formal addendum"
                  value={newRecommendedAction}
                  onChange={(e) => setNewRecommendedAction(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Save Directive"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. VIEW EVIDENCE MODAL
          ========================================================================= */}
      {selectedEvidenceTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase">
                  VERIFIED EVIDENCE CITATIONS
                </Badge>
                <h3 className="text-sm font-bold text-ink">
                  {selectedEvidenceTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidenceTask(null)}
                className="text-ink-muted hover:text-ink p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {selectedEvidenceTask.evidence_references?.map((ref, idx) => (
                <div key={idx} className="p-3.5 rounded-lg border border-border bg-background space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span className="font-semibold text-ink flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-secondary" />
                      {ref.source_title}
                    </span>
                    <span>{ref.page_number ? `Page ${ref.page_number}` : "Web Document"}</span>
                  </div>
                  <blockquote className="border-l-2 border-secondary pl-2.5 text-ink-secondary italic text-[11px] leading-relaxed">
                    "{ref.exact_quote}"
                  </blockquote>
                  {ref.confidence && (
                    <div className="text-[10px] text-ink-muted">
                      Extraction Confidence: {(ref.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEvidenceTask(null)}>
                Close Evidence
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default VerificationPage