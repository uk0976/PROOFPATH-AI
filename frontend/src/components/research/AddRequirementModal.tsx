import React, { useState } from "react"
import { X, Plus, AlertCircle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AddRequirementModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: {
    question: string
    requirement_text: string
    category: string
    description: string
    importance: string
    priority: string
    is_decision_critical: boolean
  }) => Promise<void>
  existingCategories?: string[]
}

export const AddRequirementModal: React.FC<AddRequirementModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingCategories = [],
}) => {
  const [question, setQuestion] = useState("")
  const [requirementText, setRequirementText] = useState("")
  const [category, setCategory] = useState("Eligibility Requirements")
  const [customCategory, setCustomCategory] = useState("")
  const [description, setDescription] = useState("")
  const [importance, setImportance] = useState("high")
  const [priority, setPriority] = useState("P1")
  const [isDecisionCritical, setIsDecisionCritical] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

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

    const finalCategory = customCategory.trim() || category
    const finalReqText = requirementText.trim() || question.trim()

    try {
      setIsSubmitting(true)
      setError(null)
      await onAdd({
        question: question.trim(),
        requirement_text: finalReqText,
        category: finalCategory,
        description: description.trim(),
        importance,
        priority,
        is_decision_critical: isDecisionCritical,
      })
      onClose()
      setQuestion("")
      setRequirementText("")
      setDescription("")
      setCustomCategory("")
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to add requirement.")
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
              <Plus className="w-4 h-4 text-primary" />
              <span>Add Custom Research Question</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Define a specific verifiable question or criteria for this investigation.
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
              placeholder="e.g. What are the minimum GPA and prerequisite coursework required?"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              required
            />
          </div>

          {/* Requirement Statement */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">
              Verifiable Requirement Assertion <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={requirementText}
              onChange={(e) => setRequirementText(e.target.value)}
              placeholder="e.g. Applicant must satisfy cumulative GPA threshold >= 3.5."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
            <span className="text-[10px] text-slate-400">
              If left blank, the question text will be used as the evaluation assertion.
            </span>
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Custom Category</label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Or type custom category..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Context & Verification Purpose</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain why this requirement is critical and what source evidence is needed..."
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

          {/* Decision-Critical Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isDecisionCritical}
                onChange={(e) => setIsDecisionCritical(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary"
              />
              <div>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Mark as Decision-Critical Gatekeeper
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  If this requirement lacks verifiable evidence, it directly reduces the Decision
                  Readiness Index and triggers a red flag verdict.
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-white">
              {isSubmitting ? "Adding..." : "Add Requirement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
