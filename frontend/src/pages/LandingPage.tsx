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
  CheckCircle2,
  Upload,
  Cpu,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogoIcon } from "@/components/brand/Logo"

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-ink flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-14 text-center space-y-7">
        <div className="flex justify-center mb-1">
          <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-elevated transition-transform hover:scale-105 duration-300">
            <LogoIcon size={52} className="filter drop-shadow-[0_4px_16px_rgba(37,99,235,0.3)]" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-border bg-surface shadow-subtle">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider text-ink-secondary uppercase">
            Forensic Information Intelligence Platform
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink leading-[1.12]">
          Know what's <span className="text-secondary underline decoration-secondary/30 underline-offset-8">missing</span> before you decide.
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-ink-secondary leading-relaxed font-normal">
          PROOFPATH AI investigates information across competing documents, PDFs, and web sources. It detects missing evidence, uncorroborated claims, cross-source contradictions, and the critical questions you forgot to ask.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/research">
            <Button size="lg" variant="primary" className="gap-2 px-6 shadow-subtle">
              <span>Start Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/demo">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-6 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Explore Demo Mode</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Forensic Decision Process: 4 Steps */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="border border-border bg-surface rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
              Verification Pipeline
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              How PROOFPATH AI Verifies High-Stakes Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-secondary-light text-secondary text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Multi-Source Ingestion</span>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Parse PDFs, URLs, and text memoranda with automated OCR, metadata extraction, and hash deduplication.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-secondary-light text-secondary text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Atomic Extraction</span>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Deconstruct complex prose into atomic claims, grounded by exact substring offsets and source page numbers.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-secondary-light text-secondary text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Forensic Auditing</span>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Cross-reference requirements against evidence vectors to detect gaps, contradictions, and temporal decay.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-secondary-light text-secondary text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Decision Readiness</span>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Generate an explainable Decision Readiness Index (DRI), BlindSpot insights, and a downloadable PDF dossier.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The 6 Forensic Dimensions Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full">
        <div className="text-center mb-10 space-y-2">
          <Badge variant="outline" className="font-mono uppercase text-[10px] text-ink-muted">
            Beyond Generic AI Chat & Summarization
          </Badge>
          <h2 className="text-2xl font-bold text-ink">
            The 6 Dimensions of Information Fragility
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary max-w-xl mx-auto">
            Traditional LLMs summarize unverified text. PROOFPATH AI cross-examines evidence across sources to uncover hidden risks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl border border-border bg-surface shadow-card hover:border-border-strong transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-light/70 text-secondary border border-secondary/20 flex items-center justify-center">
              <Split className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Conflicting Claims</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Detects contradictory requirements, eligibility rules, or figures across competing sources with side-by-side verbatim quotes.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card hover:border-border-strong transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-light/70 text-secondary border border-secondary/20 flex items-center justify-center">
              <EyeOff className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Information Gaps</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Surfaces complete omissions where no provided document addresses critical operational, legal, or eligibility criteria.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card hover:border-border-strong transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-light/70 text-secondary border border-secondary/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-ink text-sm">BlindSpot Discovery</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Devil's advocate reasoning uncovers high-impact risk questions you forgot to ask before signing off on a decision.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card hover:border-border-strong transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-light/70 text-secondary border border-secondary/20 flex items-center justify-center">
              <FileSearch className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Anti-Hallucination Quotes</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Every extracted claim and detected conflict is strictly verified against source text using exact substring offsets.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card hover:border-border-strong transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-light/70 text-secondary border border-secondary/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Temporal Decay Audit</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Flags outdated benchmarks, expired policies, and aging documents to prevent decisions based on stale data.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface shadow-card hover:border-border-strong transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-light/70 text-secondary border border-secondary/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-ink text-sm">Decision-Readiness Index</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Explainable 4-factor scoring (Coverage, Consistency, Freshness, Verification) produces an audit-proof sign-off score.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-ink-muted bg-surface/50">
        <p>PROOFPATH AI — Forensic Information Intelligence for High-Stakes Decision Making.</p>
      </footer>
    </div>
  )
}
