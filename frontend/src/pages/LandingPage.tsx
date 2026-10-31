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
    <div className="min-h-screen bg-canvas text-navy-900 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200/90 bg-white shadow-xs">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Forensic Information Intelligence Platform
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
          Know what's <span className="underline decoration-rose-500/80 decoration-wavy decoration-2">missing</span> before you decide.
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
          PROOFPATH AI investigates information across competing documents, PDFs, and web sources. It detects missing evidence, uncorroborated claims, cross-source contradictions, and the critical questions you forgot to ask.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/research">
            <Button size="lg" variant="primary" className="gap-2 px-6">
              <span>Start Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="secondary" className="gap-2 px-6">
              <span>Explore Demo Dossier</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* The 6 Forensic Dimensions Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-10 space-y-2">
          <Badge variant="outline" className="font-mono uppercase text-[10px] text-slate-500">
            Beyond Generic AI Chat & Summarization
          </Badge>
          <h2 className="text-2xl font-bold text-slate-900">
            The 6 Dimensions of Information Fragility
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Split className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Conflicting Claims</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detects contradictory throughput, SLA, or pricing figures across competing vendors with side-by-side verbatim quotes.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Information Gaps</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Surfaces complete omissions where no provided document addresses critical operational or security requirements.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">BlindSpot Discovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Devil's advocate reasoning uncovers high-impact risk questions you forgot to ask before signing off on a decision.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Anti-Hallucination Quotes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every extracted claim and detected conflict is strictly verified against source text using exact substring offsets.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Temporal Decay Audit</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Flags outdated benchmarks, expired policies, and aging whitepapers to prevent decisions based on stale data.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-card space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Decision-Readiness Index</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explainable 4-factor scoring (Coverage, Consistency, Freshness, Verification) produces an audit-proof sign-off score.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>PROOFPATH AI — Forensic Information Intelligence for High-Stakes Decision Making.</p>
      </footer>
    </div>
  )
}
