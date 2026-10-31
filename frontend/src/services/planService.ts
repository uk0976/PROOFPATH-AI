import { apiClient } from "./api"
import { RequirementItem, ResearchPlanSummary } from "@/types"

export interface GeneratePlanPayload {
  goal?: string
  target_decision?: string
  domain_context?: string
  max_criteria?: number
  replace_existing_suggestions?: boolean
}

export interface ApprovePlanPayload {
  approved_requirement_ids?: string[]
  decision_critical_ids?: string[]
}

export const planService = {
  async getPlan(sessionId: string): Promise<ResearchPlanSummary> {
    const res = await apiClient.get<ResearchPlanSummary>(`/research/${sessionId}/plan`)
    return res.data
  },

  async generatePlan(sessionId: string, payload?: GeneratePlanPayload): Promise<ResearchPlanSummary> {
    const res = await apiClient.post<ResearchPlanSummary>(`/research/${sessionId}/plan/generate`, payload || {})
    return res.data
  },

  async approvePlan(sessionId: string, payload?: ApprovePlanPayload): Promise<ResearchPlanSummary> {
    const res = await apiClient.post<ResearchPlanSummary>(`/research/${sessionId}/plan/approve`, payload || {})
    return res.data
  },

  async addRequirement(sessionId: string, data: Partial<RequirementItem>): Promise<RequirementItem> {
    const res = await apiClient.post<RequirementItem>(`/research/${sessionId}/requirements`, data)
    return res.data
  },

  async updateRequirement(requirementId: string, data: Partial<RequirementItem>): Promise<RequirementItem> {
    const res = await apiClient.patch<RequirementItem>(`/requirements/${requirementId}`, data)
    return res.data
  },

  async deleteRequirement(requirementId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/requirements/${requirementId}`)
    return res.data
  },
}
