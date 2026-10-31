import { apiClient } from "./api"
import { ResearchSessionSummary, ResearchSessionResponse } from "@/types"

export const researchService = {
  async listSessions(): Promise<ResearchSessionSummary[]> {
    const res = await apiClient.get<ResearchSessionSummary[]>("/research/")
    return res.data
  },

  async getSession(id: string): Promise<ResearchSessionResponse> {
    const res = await apiClient.get<ResearchSessionResponse>(`/research/${id}`)
    return res.data
  },

  async createSession(data: {
    title: string
    research_goal: string
    target_decision?: string
  }): Promise<ResearchSessionResponse> {
    const res = await apiClient.post<ResearchSessionResponse>("/research/", data)
    return res.data
  },

  async startInvestigation(id: string): Promise<{ session_id: string; status: string; stream_url: string }> {
    const res = await apiClient.post(`/research/${id}/start`)
    return res.data
  },
}
