import React, { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CheckSquare,
  AlertTriangle,
  FileCheck2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"
import { reportService, VerificationTaskItem } from "@/services/reportService"
import { researchService } from "@/services/researchService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const VerificationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: () => researchService.getSession(id!),
    enabled: !!id,
  })

  // Fetch verified tasks from backend API
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["verification", id],
    queryFn: () => reportService.getVerification(id!),
    enabled: !!id,
  })

  // Patch task mutation
  const patchMutation = useMutation({
    mutationFn: ({ taskId, is_completed }: { taskId: string; is_completed: boolean }) =>
      reportService.patchVerification(taskId, { is_completed }),
    onMutate: async ({ taskId, is_completed }) => {
      await queryClient.cancelQueries({ queryKey: ["verification", id] })
      const previous = queryClient.getQueryData<VerificationTaskItem[]>(["verification", id])
      if (previous) {
        queryClient.setQueryData<VerificationTaskItem[]>(
          ["verification", id],
          previous.map((t) => (t.id === taskId ? { ...t, is_completed } : t))
        )
      }
      return { previous }
    },
    onError: (err, newTodo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["verification", id], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["verification", id] })
      queryClient.invalidateQueries({ queryKey: ["session", id] })
    },
  })

  const toggleTask = (task: VerificationTaskItem) => {
    patchMutation.mutate({
      taskId: task.id,
      is_completed: !task.is_completed,
    })
  }

  const allTasks = tasks || []
  const completedCount = allTasks.filter((t) => t.is_completed).length
  const totalItems = allTasks.length

  const contradictionTasks = allTasks.filter((t) => t.task_type === "contradiction")
  const blindspotTasks = allTasks.filter((t) => t.task_type === "blindspot")
  const otherTasks = allTasks.filter(
    (t) => t.task_type !== "contradiction" && t.task_type !== "blindspot"
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-secondary" />
            <span>Pre-Decision Verification Planner</span>
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Actionable verification checklist required to arbitrate contradictions and resolve blindspots.
          </p>
        </div>

        {/* Counter */}
        <div className="text-right">
          <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block">
            Verification Sign-off
          </span>
          <span className="text-lg font-bold text-ink">
            {completedCount} / {totalItems} Completed
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-secondary animate-spin mx-auto" />
          <p className="text-xs text-ink-secondary">Compiling verification tasks...</p>
        </div>
      ) : totalItems === 0 ? (
        <div className="p-8 text-center text-xs text-ink-secondary bg-surface rounded-xl border border-border">
          No verification tasks generated yet. Start an investigation to generate action items.
        </div>
      ) : (
        <>
          {/* Section 1: Resolve Critical Contradictions */}
          {contradictionTasks.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-danger" />
                  <span>1. Cross-Source Contradictions Requiring Arbitration</span>
                </h2>
                <Badge variant="outline">{contradictionTasks.length} Items</Badge>
              </div>

              <div className="space-y-2">
                {contradictionTasks.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-border-subtle hover:bg-surface-muted cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={t.is_completed}
                      onChange={() => toggleTask(t)}
                      className="mt-1 rounded text-secondary focus:ring-secondary h-4 w-4"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            t.is_completed ? "line-through text-ink-muted" : "text-ink"
                          }`}
                        >
                          {t.title}
                        </span>
                        <Badge variant="danger" className="text-[10px]">
                          CONTRADICTION
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="text-xs text-ink-secondary">{t.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Review BlindSpots */}
          {blindspotTasks.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-secondary" />
                  <span>2. BlindSpot Questions Requiring Stakeholder Alignment</span>
                </h2>
                <Badge variant="outline">{blindspotTasks.length} Items</Badge>
              </div>

              <div className="space-y-2">
                {blindspotTasks.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-border-subtle hover:bg-surface-muted cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={t.is_completed}
                      onChange={() => toggleTask(t)}
                      className="mt-1 rounded text-secondary focus:ring-secondary h-4 w-4"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            t.is_completed ? "line-through text-ink-muted" : "text-ink"
                          }`}
                        >
                          {t.title}
                        </span>
                        <Badge variant="warning" className="text-[10px]">
                          BLINDSPOT
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="text-xs text-ink-secondary">{t.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Other Tasks */}
          {otherTasks.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-primary" />
                  <span>3. General Evidence Verification</span>
                </h2>
                <Badge variant="outline">{otherTasks.length} Items</Badge>
              </div>

              <div className="space-y-2">
                {otherTasks.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-border-subtle hover:bg-surface-muted cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={t.is_completed}
                      onChange={() => toggleTask(t)}
                      className="mt-1 rounded text-secondary focus:ring-secondary h-4 w-4"
                    />
                    <div className="space-y-1">
                      <span
                        className={`text-xs font-semibold ${
                          t.is_completed ? "line-through text-ink-muted" : "text-ink"
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.description && (
                        <p className="text-xs text-ink-secondary">{t.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Export Action */}
      <div className="flex items-center justify-end pt-2">
        <Link to={`/report/${id}`}>
          <Button size="lg" variant="primary" className="gap-2">
            <span>Proceed to Executive Briefing Dossier</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
