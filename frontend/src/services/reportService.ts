import { apiClient } from "./api"
import { BlindSpotItem } from "@/types"

export const reportService = {
  async getBlindspots(sessionId: string): Promise<BlindSpotItem[]> {
    const res = await apiClient.get<BlindSpotItem[]>(`/blindspots/${sessionId}`)
    return res.data
  },

  async toggleBlindspot(id: string): Promise<{ id: string; is_resolved: boolean }> {
    const res = await apiClient.post<{ id: string; is_resolved: boolean }>(`/blindspots/${id}/toggle`)
    return res.data
  },

  async downloadMarkdownReport(sessionId: string): Promise<Blob> {
    const res = await apiClient.get(`/reports/${sessionId}/markdown`, {
      responseType: "blob",
    })
    return res.data
  },
}
