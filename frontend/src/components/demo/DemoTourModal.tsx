import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  GitBranch,
  HelpCircle,
  FileCheck2,
  FileText,
  Download,
  ListOrdered,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DEMO_SESSION_ID } from "@/utils/sampleData"

interface TourStep {
  step: number
  title: string
  subtitle: string
  description: string
  evaluatorNote: string
  icon: React.ElementType
  targetRoute: string
  buttonLabel: string
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: "1. Open Demo Mode",
    subtitle: "Synthetic Scholarship Application Scenario",
    description:
      "Welcome to PROOFPATH AI Demo Mode! This environment runs entirely offline with zero external API key requirements. A fictional student is investigating eligibility for the Federal STEM Postgraduate Scholarship.",
    evaluatorNote:
      "All documents and results are strictly labelled as [SAMPLE DATA] to preserve epistemic integrity. No fictional requirements are presented as real government regulations.",
    icon: ShieldCheck,
    targetRoute: `/intelligence/${DEMO_SESSION_ID}`,
    buttonLabel: "View Intelligence Dashboard",
  },
  {
    step: 2,
    title: "2. View Research Question & Requirements",
    subtitle: "Goal Decomposition into 5 Structured Criteria",
    description:
      "Observe how the broad question 'Tell me everything I should know before applying' was decomposed into 5 structured requirements: GPA cutoff, Citizenship, Income ceiling, Recommendation letters, and Medical insurance.",
    evaluatorNote:
      "Each requirement is assigned a category, importance weight, decision-critical flag, and expected evidence standard.",
    icon: ListOrdered,
    targetRoute: `/research/${DEMO_SESSION_ID}/plan`,
    buttonLabel: "Inspect Research Plan",
  },
  {
    step: 3,
    title: "3. Explore Ingested Sources",
    subtitle: "3 Multi-Modal Guidelines & Circulars",
    description:
      "Review the three sample documents ingested into the investigation corpus: an official 2026 PDF guideline, a university financial aid URL, and an archived 2023 assistance circular.",
    evaluatorNote:
      "Notice how publication dates and provenance metadata are cleanly extracted and preserved across formats.",
    icon: FileText,
    targetRoute: `/sources/${DEMO_SESSION_ID}`,
    buttonLabel: "Explore Ingested Sources",
  },
  {
    step: 4,
    title: "4. Review Extracted Claims",
    subtitle: "Atomic Claims with Verbatim Evidence Provenance",
    description:
      "Examine atomic claims extracted from the source documents. Every single claim is anchored to an exact quote, document page or section, date reference, and confidence score.",
    evaluatorNote:
      "Compound sentences are atomized into individual verifiable statements, eliminating epistemic hallucination.",
    icon: Eye,
    targetRoute: `/investigation/${DEMO_SESSION_ID}`,
    buttonLabel: "Review Extracted Claims",
  },
  {
    step: 5,
    title: "5. Open a Missing Information Finding",
    subtitle: "Epistemic Integrity: Revealing Evidentiary Absence",
    description:
      "Navigate to Requirement 5 (Mandatory International Medical Insurance). While conventional search engines invent answers, PROOFPATH AI explicitly flags this requirement as 'MISSING' with Critical priority.",
    evaluatorNote:
      "This demonstrates PROOFPATH AI's core value: alerting the user to what is absent before they submit their application.",
    icon: AlertTriangle,
    targetRoute: `/gaps/${DEMO_SESSION_ID}`,
    buttonLabel: "Inspect Gap Findings",
  },
  {
    step: 6,
    title: "6. Compare Conflicting Claims",
    subtitle: "Cross-Source Contradiction: 3.5 vs 3.7 GPA Cutoff",
    description:
      "Compare the academic GPA requirement across sources: the official guidelines cite a 3.5 minimum baseline, while the university handbook specifies a 3.7 priority quota. Review the 10-dimension scope comparison.",
    evaluatorNote:
      "The system distinguishes between genuine mathematical contradictions and compatible scope differentiation across applicant cohorts.",
    icon: Scale,
    targetRoute: `/contradictions/${DEMO_SESSION_ID}`,
    buttonLabel: "Compare Conflicting Claims",
  },
  {
    step: 7,
    title: "7. Explore Evidence Knowledge Graph",
    subtitle: "Interactive Visual Network of Provenance",
    description:
      "Explore the interactive React Flow knowledge graph connecting the high-level research goal, the 5 requirements, atomic claims, and source nodes with color-coded support, refutation, and conflict edges.",
    evaluatorNote:
      "Visualizes the multi-tier evidential foundation supporting the 74.5% Decision Readiness score.",
    icon: GitBranch,
    targetRoute: `/evidence/${DEMO_SESSION_ID}`,
    buttonLabel: "Explore Evidence Graph",
  },
  {
    step: 8,
    title: "8. Review BlindSpot Questions",
    subtitle: "Uncovering Crucial Overlooked Dimensions",
    description:
      "Review the BlindSpot Discovery engine output: vital questions the applicant forgot to ask, including college transfer mid-year rules, post-deadline grace periods, and anti-stacking fellowship clauses.",
    evaluatorNote:
      "Applicants can star, dismiss, or directly add high-impact BlindSpots into their active research plan.",
    icon: HelpCircle,
    targetRoute: `/blindspots/${DEMO_SESSION_ID}`,
    buttonLabel: "Review BlindSpots",
  },
  {
    step: 9,
    title: "9. View Verification Checklist",
    subtitle: "Actionable Directives for Safe Decision-Making",
    description:
      "Inspect the generated verification checklist translating investigation gaps and contradictions into prioritized action items. Try marking a task as completed or adding a custom note.",
    evaluatorNote:
      "Provides unambiguous operational next steps so the candidate can resolve discrepancies with university officials before applying.",
    icon: FileCheck2,
    targetRoute: `/verification/${DEMO_SESSION_ID}`,
    buttonLabel: "View Verification Checklist",
  },
  {
    step: 10,
    title: "10. Download Investigation Report",
    subtitle: "Professional 16-Section ReportLab PDF Dossier",
    description:
      "Generate and download the complete 16-section PDF investigation report, complete with executive summary, evidence matrix, contradiction audit, and verification checklist.",
    evaluatorNote:
      "Click the 'Download PDF' button in the dashboard or report page to test instant PDF compilation and streaming.",
    icon: Download,
    targetRoute: `/report/${DEMO_SESSION_ID}`,
    buttonLabel: "Open Final Report",
  },
]

interface DemoTourModalProps {
  isOpen: boolean
  onClose: () => void
  initialStep?: number
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  initialStep = 1,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(initialStep - 1)
  const navigate = useNavigate()

  if (!isOpen) return null

  const current = TOUR_STEPS[currentStepIndex]
  const Icon = current.icon

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const handleNavigateToTarget = () => {
    navigate(current.targetRoute)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-xl shadow-card max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] py-0">
                  JUDGE EVALUATION TOUR
                </Badge>
                <span className="text-xs text-ink-muted">
                  Step {current.step} of {TOUR_STEPS.length}
                </span>
              </div>
              <h3 className="text-base font-semibold text-ink mt-0.5">{current.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-secondary hover:text-ink hover:bg-background rounded-lg p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {current.subtitle}
            </span>
            <p className="text-sm text-ink-secondary mt-1.5 leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Evaluator Highlight Box */}
          <div className="p-3.5 rounded-lg bg-background border border-border border-l-4 border-l-primary space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>What Judges Should Notice</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {current.evaluatorNote}
            </p>
          </div>

          {/* Step Pill Indicators */}
          <div className="pt-2">
            <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Tour Steps (Click to Jump)
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-7 rounded text-xs font-mono font-medium flex items-center justify-center transition-colors ${
                    idx === currentStepIndex
                      ? "bg-primary text-white shadow-xs font-bold"
                      : idx < currentStepIndex
                      ? "bg-secondary-light text-secondary border border-secondary/20"
                      : "bg-background text-ink-muted border border-border hover:bg-surface hover:text-ink"
                  }`}
                  title={step.title}
                >
                  {step.step}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-border bg-surface-muted/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Finish Tour
                </>
              ) : (
                <>
                  Next Step
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNavigateToTarget}
          >
            <span>{current.buttonLabel}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
