import { apiClient } from "./api"
import { BlindSpotItem, BlindSpotActionPayload } from "@/types"

export interface EvidenceSnippet {
  source_title: string
  exact_quote: string
  page_number?: number
  source_id?: string
  source_type?: string
  confidence?: number
}

export interface VerificationTaskItem {
  id: string
  session_id: string
  task_type: string
  title: string
  description?: string
  priority: "critical" | "high" | "medium" | "low" | string
  related_requirement_id?: string
  related_requirement_text?: string
  related_finding_id?: string
  evidence_references?: EvidenceSnippet[]
  recommended_action?: string
  is_completed: boolean
  is_custom?: boolean
  notes?: string
  created_at: string
}

export interface VerificationTaskCreatePayload {
  title: string
  description?: string
  task_type?: string
  priority?: string
  related_requirement_id?: string
  related_requirement_text?: string
  recommended_action?: string
  notes?: string
}

export interface ReportGenerated {
  id: string
  session_id: string
  title: string
  format: string
  created_at: string
  download_url: string
}

export const reportService = {
  // BlindSpots
  async getBlindspots(
    sessionId: string,
    params?: { include_dismissed?: boolean; risk_level?: string }
  ): Promise<BlindSpotItem[]> {
    const res = await apiClient.get<BlindSpotItem[]>(`/research/${sessionId}/blindspots`, { params })
    return res.data
  },

  async discoverBlindspots(sessionId: string): Promise<BlindSpotItem[]> {
    const res = await apiClient.post<BlindSpotItem[]>(`/research/${sessionId}/discover-blindspots`)
    return res.data
  },

  async addToPlan(blindspotId: string): Promise<BlindSpotActionPayload> {
    const res = await apiClient.post<BlindSpotActionPayload>(`/blindspots/${blindspotId}/add-to-plan`)
    return res.data
  },

  async toggleStar(blindspotId: string): Promise<BlindSpotActionPayload> {
    const res = await apiClient.post<BlindSpotActionPayload>(`/blindspots/${blindspotId}/toggle-star`)
    return res.data
  },

  async dismissBlindspot(blindspotId: string): Promise<BlindSpotActionPayload> {
    const res = await apiClient.post<BlindSpotActionPayload>(`/blindspots/${blindspotId}/dismiss`)
    return res.data
  },

  async toggleBlindspot(id: string): Promise<{ id: string; is_resolved: boolean }> {
    const res = await apiClient.post<{ id: string; is_resolved: boolean }>(`/blindspots/${id}/investigate`)
    return res.data
  },

  // Verification Tasks
  async getVerification(
    sessionId: string,
    params?: { priority?: string; status?: string }
  ): Promise<VerificationTaskItem[]> {
    const res = await apiClient.get<VerificationTaskItem[]>(`/research/${sessionId}/verification`, { params })
    return res.data
  },

  async createCustomVerificationTask(
    sessionId: string,
    data: VerificationTaskCreatePayload
  ): Promise<VerificationTaskItem> {
    const res = await apiClient.post<VerificationTaskItem>(`/research/${sessionId}/verification`, data)
    return res.data
  },

  async regenerateVerificationTasks(sessionId: string): Promise<VerificationTaskItem[]> {
    const res = await apiClient.post<VerificationTaskItem[]>(`/research/${sessionId}/verification/generate`)
    return res.data
  },

  async patchVerification(
    taskId: string,
    data: { is_completed?: boolean; notes?: string; priority?: string }
  ): Promise<VerificationTaskItem> {
    const res = await apiClient.patch<VerificationTaskItem>(`/verification/${taskId}`, data)
    return res.data
  },

  async toggleVerification(taskId: string): Promise<VerificationTaskItem> {
    const res = await apiClient.post<VerificationTaskItem>(`/verification/${taskId}/toggle`)
    return res.data
  },

  async deleteVerification(taskId: string): Promise<void> {
    await apiClient.delete(`/verification/${taskId}`)
  },

  // Reports
  async generateReport(
    sessionId: string,
    data?: { title?: string; format?: string }
  ): Promise<ReportGenerated> {
    const res = await apiClient.post<ReportGenerated>(`/research/${sessionId}/report`, data || {})
    return res.data
  },

  async downloadReport(reportId: string): Promise<Blob> {
    const res = await apiClient.get(`/reports/${reportId}/download`, {
      responseType: "blob",
    })
    return res.data
  },

  async downloadMarkdownReport(sessionId: string): Promise<Blob> {
    const res = await apiClient.get(`/reports/${sessionId}/markdown`, {
      responseType: "blob",
    })
    return res.data
  },

  async downloadPdfReport(sessionId: string): Promise<Blob> {
    const res = await apiClient.get(`/reports/${sessionId}/pdf`, {
      responseType: "blob",
    })
    return res.data
  },
}
