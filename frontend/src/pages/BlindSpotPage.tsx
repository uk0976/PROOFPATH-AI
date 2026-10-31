import React from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  HelpCircle,
  AlertOctagon,
  CheckCircle2,
  Circle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react"
import { reportService } from "@/services/reportService"
import { Badge } from "@/components/ui/badge"

export const BlindSpotPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: blindspots, isLoading } = useQuery({
    queryKey: ["blindspots", id],
    queryFn: () => reportService.getBlindspots(id!),
    enabled: !!id,
  })

  const toggleMutation = useMutation({
    mutationFn: (blindspotId: string) => reportService.toggleBlindspot(blindspotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blindspots", id] })
    },
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-brand" />
          <span>BlindSpot Discovery — Questions You Forgot to Ask</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Counter-factual risk vectors and unaddressed assumptions discovered by the devil's advocate reasoning agent.
        </p>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 py-6">Discovering blind spots...</div>
      ) : blindspots?.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 border rounded-xl bg-white">
          No unaddressed blindspots found for this investigation.
        </div>
      ) : (
        <div className="space-y-4">
          {blindspots?.map((spot) => (
            <div
              key={spot.id}
              className={`border rounded-xl p-5 shadow-card transition-all space-y-3 ${
                spot.is_resolved
                  ? "bg-slate-50/70 border-slate-200 opacity-75"
                  : "bg-white border-slate-200/90 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate(spot.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {spot.is_resolved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <h3
                      className={`text-sm font-semibold ${
                        spot.is_resolved ? "line-through text-slate-500" : "text-slate-900"
                      }`}
                    >
                      {spot.question}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                        {spot.category.replace("_", " ")}
                      </Badge>
                      <Badge variant={spot.risk_level === "high" ? "danger" : "warning"}>
                        {spot.risk_level.toUpperCase()} RISK
                      </Badge>
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-slate-400">
                  {spot.is_resolved ? "Resolved" : "Pending Sign-off"}
                </span>
              </div>

              {/* Rationale */}
              <div className="ml-8 p-3 rounded-lg bg-slate-50 text-xs text-slate-600 leading-relaxed border border-slate-100">
                <span className="font-semibold text-slate-800">Operational Risk: </span>
                <span>{spot.rationale}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
