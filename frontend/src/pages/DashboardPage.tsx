import React, { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Plus,
  Search,
  ArrowRight,
  ShieldAlert,
  FileText,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react"
import { researchService } from "@/services/researchService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, getReadinessTier } from "@/utils/formatters"
import { SAMPLE_SESSION_SUMMARY } from "@/utils/sampleData"

export const DashboardPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      try {
        const live = await researchService.listSessions()
        return live.length > 0 ? live : [SAMPLE_SESSION_SUMMARY]
      } catch {
        // Fallback to clearly labelled sample data in offline demo mode
        return [SAMPLE_SESSION_SUMMARY]
      }
    },
    placeholderData: [SAMPLE_SESSION_SUMMARY],
  })

  const filteredSessions = sessions?.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.research_goal.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Research Investigations
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Forensic dossiers, cross-source conflict audits, and decision-readiness indices.
          </p>
        </div>
        <Link to="/research">
          <Button variant="primary" size="md">
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3 max-w-md bg-surface border border-border rounded-lg px-3 py-1.5 shadow-subtle focus-within:ring-2 focus-within:ring-secondary focus-within:border-transparent">
        <Search className="w-4 h-4 text-ink-muted" />
        <input
          type="text"
          placeholder="Filter by title or research goal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs text-ink placeholder:text-ink-muted bg-transparent focus:outline-none"
        />
      </div>

      {/* Session Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-secondary">
          Loading investigation dossiers...
        </div>
      ) : filteredSessions?.length === 0 ? (
        <div className="border border-dashed border-border-strong rounded-xl p-12 text-center space-y-3 bg-surface">
          <ShieldAlert className="w-8 h-8 text-ink-muted mx-auto" />
          <h3 className="text-sm font-semibold text-ink">No investigations found</h3>
          <p className="text-xs text-ink-secondary max-w-sm mx-auto">
            Create your first forensic research dossier to cross-examine claims across multiple sources.
          </p>
          <Link to="/research">
            <Button size="sm" variant="primary">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Investigation</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSessions?.map((session) => {
            const tier = getReadinessTier(session.readiness_score)
            const isDemo = session.id.startsWith("demo-")

            return (
              <div
                key={session.id}
                className="bg-surface border border-border rounded-xl p-5 shadow-card hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-ink text-base leading-snug">
                      {session.title}
                    </span>
                    <Badge variant={session.status === "completed" ? "success" : "secondary"}>
                      {session.status.toUpperCase()}
                    </Badge>
                    {isDemo && (
                      <Badge variant="outline" className="text-[10px] font-mono text-secondary">
                        SAMPLE DATA
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-secondary line-clamp-2">
                    {session.research_goal}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink-secondary pt-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-ink-muted" />
                      {session.source_count} Sources
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-status-danger" />
                      {session.conflict_count} Conflicts
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-secondary" />
                      {session.blindspot_count} BlindSpots
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.created_at)}
                    </span>
                  </div>
                </div>

                {/* Score & Action Button */}
                <div className="flex items-center gap-5 shrink-0 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-ink">
                      {session.readiness_score.toFixed(1)}%
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${tier.bgColor} ${tier.color} ${tier.borderColor}`}>
                      {tier.tier}
                    </span>
                  </div>

                  <Link to={`/investigation/${session.id}`}>
                    <Button variant="secondary" size="sm" className="gap-1.5">
                      <span>View Audit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
