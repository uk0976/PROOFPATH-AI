import React, { useState, useEffect } from "react"
import { X, Edit3, AlertCircle, ShieldAlert } from "lucide-react"
import { RequirementItem } from "@/types"
import { Button } from "@/components/ui/button"

interface EditRequirementModalProps {
  isOpen: boolean
  requirement: RequirementItem | null
  onClose: () => void
  onSave: (
    requirementId: string,
    data: {
      question?: string
      requirement_text?: string
      category?: string
      description?: string
      importance?: string
      priority?: string
      is_decision_critical?: boolean
      is_approved?: boolean
    }
  ) => Promise<void>
  existingCategories?: string[]
}

export const EditRequirementModal: React.FC<EditRequirementModalProps> = ({
  isOpen,
  requirement,
  onClose,
  onSave,
  existingCategories = [],
}) => {
  const [question, setQuestion] = useState("")
  const [requirementText, setRequirementText] = useState("")
  const [category, setCategory] = useState("General")
  const [description, setDescription] = useState("")
  const [importance, setImportance] = useState("high")
  const [priority, setPriority] = useState("P1")
  const [isDecisionCritical, setIsDecisionCritical] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requirement) {
      setQuestion(requirement.question || requirement.requirement_text || "")
      setRequirementText(requirement.requirement_text || "")
      setCategory(requirement.category || "General")
      setDescription(requirement.description || "")
      setImportance(requirement.importance || "high")
      setPriority(requirement.priority || "P1")
      setIsDecisionCritical(Boolean(requirement.is_decision_critical))
      setIsApproved(Boolean(requirement.is_approved))
      setError(null)
    }
  }, [requirement])

  if (!isOpen || !requirement) return null

  const defaultCategories = [
    "Eligibility Requirements",
    "Academic Requirements",
    "Income Requirements",
    "Required Documents",
    "Application Deadlines",
    "Application Procedure",
    "Renewal Conditions",
    "Restrictions",
    "Exceptions",
    "Unit Economics",
    "Market Sizing",
    "Regulatory Compliance",
    "Performance Benchmarks",
    "Security Standards",
    "General",
  ]

  const categories = Array.from(new Set([...defaultCategories, ...existingCategories]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) {
      setError("Please provide an interrogative research question.")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSave(requirement.id, {
        question: question.trim(),
        requirement_text: requirementText.trim() || question.trim(),
        category,
        description: description.trim(),
        importance,
        priority,
        is_decision_critical: isDecisionCritical,
        is_approved: isApproved,
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to update requirement.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <span>Edit Research Criterion</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              ID: {requirement.id} ({requirement.origin === "ai_suggested" ? "AI Suggestion" : "User Specified"})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Question */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">
              Interrogative Question <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              required
            />
          </div>

          {/* Requirement Statement */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Verifiable Requirement Assertion</label>
            <input
              type="text"
              value={requirementText}
              onChange={(e) => setRequirementText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Description / Verification Context</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {/* Importance & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Importance</label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="critical">Critical (Mandatory)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Priority Tier</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="P0">P0 — Dealbreaker / Gatekeeper</option>
                <option value="P1">P1 — Essential Criterion</option>
                <option value="P2">P2 — Recommended Factor</option>
                <option value="P3">P3 — Supplementary Detail</option>
              </select>
            </div>
          </div>

          {/* Decision-Critical & Approved Toggles */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isDecisionCritical}
                onChange={(e) => setIsDecisionCritical(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Mark as Decision-Critical Gatekeeper
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isApproved}
                onChange={(e) => setIsApproved(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-slate-800">
                Official Approved Requirement (Promote from AI Suggestion)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
