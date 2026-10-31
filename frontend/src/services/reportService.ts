import { apiClient } from "./api"
import { BlindSpotItem } from "@/types"

export interface VerificationTaskItem {
  id: string
  session_id: string
  task_type: string
  title: string
  description?: string
  is_completed: boolean
  assigned_to?: string
  notes?: string
  created_at: string
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
  async getBlindspots(sessionId: string): Promise<BlindSpotItem[]> {
    const res = await apiClient.get<BlindSpotItem[]>(`/research/${sessionId}/blindspots`)
    return res.data
  },

  async toggleBlindspot(id: string): Promise<{ id: string; is_resolved: boolean }> {
    const res = await apiClient.post<{ id: string; is_resolved: boolean }>(`/blindspots/${id}/investigate`)
    return res.data
  },

  async getVerification(sessionId: string): Promise<VerificationTaskItem[]> {
    const res = await apiClient.get<VerificationTaskItem[]>(`/research/${sessionId}/verification`)
    return res.data
  },

  async patchVerification(
    taskId: string,
    data: { is_completed?: boolean; notes?: string }
  ): Promise<VerificationTaskItem> {
    const res = await apiClient.patch<VerificationTaskItem>(`/verification/${taskId}`, data)
    return res.data
  },

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
}
