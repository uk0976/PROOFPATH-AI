import { apiClient } from "./api"
import {
  RequirementItem,
  ContradictionItem,
  InformationGapItem,
  TemporalAuditItem,
  AtomicClaimItem,
  EvidenceGraphData,
  MatrixViewData,
} from "@/types"

export interface FindingsOverview {
  research_id: string
  total_conflicts: number
  total_gaps: number
  total_temporal_flags: number
  contradictions: ContradictionItem[]
  information_gaps: InformationGapItem[]
  temporal_audit: TemporalAuditItem[]
}

export const findingService = {
  async getRequirements(sessionId: string): Promise<RequirementItem[]> {
    const res = await apiClient.get<RequirementItem[]>(`/research/${sessionId}/requirements`)
    return res.data
  },

  async getAllFindings(sessionId: string): Promise<FindingsOverview> {
    const res = await apiClient.get<FindingsOverview>(`/research/${sessionId}/findings`)
    return res.data
  },

  async getConflicts(sessionId: string): Promise<ContradictionItem[]> {
    const res = await apiClient.get<ContradictionItem[]>(`/findings/${sessionId}/conflicts`)
    return res.data
  },

  async getGaps(sessionId: string): Promise<InformationGapItem[]> {
    const res = await apiClient.get<InformationGapItem[]>(`/findings/${sessionId}/gaps`)
    return res.data
  },

  async getTemporalAudit(sessionId: string): Promise<TemporalAuditItem[]> {
    const res = await apiClient.get<TemporalAuditItem[]>(`/findings/${sessionId}/temporal`)
    return res.data
  },

  async getClaims(
    sessionId: string,
    params?: {
      category?: string
      source_id?: string
      source_type?: string
      is_verified?: boolean
      search?: string
    }
  ): Promise<AtomicClaimItem[]> {
    const res = await apiClient.get<AtomicClaimItem[]>(`/research/${sessionId}/claims`, { params })
    return res.data
  },

  async extractClaims(sessionId: string): Promise<AtomicClaimItem[]> {
    const res = await apiClient.post<AtomicClaimItem[]>(`/research/${sessionId}/extract-claims`)
    return res.data
  },

  async retrieveEvidence(sessionId: string, similarityThreshold = 0.30): Promise<any> {
    const res = await apiClient.post(`/research/${sessionId}/retrieve-evidence`, null, {
      params: { similarity_threshold: similarityThreshold }
    })
    return res.data
  },

  async getMatrix(sessionId: string): Promise<MatrixViewData> {
    const res = await apiClient.get<MatrixViewData>(`/research/${sessionId}/evidence`)
    return res.data
  },

  async getEvidenceGraph(sessionId: string): Promise<EvidenceGraphData> {
    const res = await apiClient.get<EvidenceGraphData>(`/research/${sessionId}/graph`)
    return res.data
  },
}
