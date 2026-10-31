import { apiClient } from "./api"
import { ResearchSessionResponse, ResearchSessionSummary } from "@/types"
import { DEMO_SESSION_ID } from "@/utils/sampleData"

export interface DemoLoadResponse {
  status: string
  session_id: string
  is_sample_data: boolean
  disclaimer: string
  session: ResearchSessionSummary
}

export interface DemoResetResponse {
  status: string
  session_id: string
  message: string
  is_sample_data: boolean
  session: {
    id: string
    title: string
    status: string
    readiness_score: number
  }
}

export interface DemoStatusResponse {
  mode: string
  is_seeded: boolean
  session_id: string
  offline_ready: boolean
  api_key_required: boolean
  dataset_type: string
  sample_markings_enforced: boolean
}

export const demoService = {
  async loadDemo(): Promise<DemoLoadResponse> {
    const res = await apiClient.post<DemoLoadResponse>("/demo/load")
    return res.data
  },

  async resetDemo(): Promise<DemoResetResponse> {
    const res = await apiClient.post<DemoResetResponse>("/demo/reset")
    return res.data
  },

  async getDemoSession(): Promise<ResearchSessionResponse> {
    const res = await apiClient.get<ResearchSessionResponse>("/demo/session")
    return res.data
  },

  async getDemoStatus(): Promise<DemoStatusResponse> {
    const res = await apiClient.get<DemoStatusResponse>("/demo/status")
    return res.data
  },
}
