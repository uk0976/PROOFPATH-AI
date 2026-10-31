import React from "react"
import { Link } from "react-router-dom"
import {
  ShieldAlert,
  ArrowRight,
  Split,
  FileSearch,
  HelpCircle,
  EyeOff,
  Clock,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-ink flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface shadow-subtle">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-ink-secondary uppercase">
            Forensic Information Intelligence Platform
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.15]">
          Know what's <span className="underline decoration-status-danger decoration-wavy decoration-2">missing</span> before you decide.
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-ink-secondary leading-relaxed font-normal">
          PROOFPATH AI investigates information across competing documents, PDFs, and web sources. It detects missing evidence, uncorroborated claims, cross-source contradictions, and the critical questions you forgot to ask.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/research">
            <Button size="lg" variant="primary" className="gap-2 px-6">
              <span>Start Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/demo">
            <Button size="lg" variant="outline" className="gap-2 px-6 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Explore Demo Mode</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* The 6 Forensic Dimensions Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-10 space-y-2">
          <Badge variant="outline" className="font-mono uppercase text-[10px] text-ink-muted">
            Beyond Generic AI Chat & Summarization
          </Badge>
          <h2 className="text-2xl font-bold text-ink">
            The 6 Dimensions of Information Fragility
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-status-danger-bg text-status-danger flex items-center justify-center">
              <Split className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Conflicting Claims</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Detects contradictory throughput, SLA, or pricing figures across competing vendors with side-by-side verbatim quotes.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-status-warning-bg text-status-warning flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Information Gaps</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Surfaces complete omissions where no provided document addresses critical operational or security requirements.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-secondary-light text-secondary flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ink text-sm">BlindSpot Discovery</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Devil's advocate reasoning uncovers high-impact risk questions you forgot to ask before signing off on a decision.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-status-success-bg text-status-success flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Anti-Hallucination Quotes</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Every extracted claim and detected conflict is strictly verified against source text using exact substring offsets.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Temporal Decay Audit</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Flags outdated benchmarks, expired policies, and aging whitepapers to prevent decisions based on stale data.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-background text-primary flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Decision-Readiness Index</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Explainable 4-factor scoring (Coverage, Consistency, Freshness, Verification) produces an audit-proof sign-off score.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-ink-muted">
        <p>PROOFPATH AI — Forensic Information Intelligence for High-Stakes Decision Making.</p>
      </footer>
    </div>
  )
}
