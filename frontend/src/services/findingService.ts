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

export const findingService = {
  async getRequirements(sessionId: string): Promise<RequirementItem[]> {
    const res = await apiClient.get<RequirementItem[]>(`/requirements/${sessionId}`)
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

  async getClaims(sessionId: string): Promise<AtomicClaimItem[]> {
    const res = await apiClient.get<AtomicClaimItem[]>(`/evidence/${sessionId}/claims`)
    return res.data
  },

  async getMatrix(sessionId: string): Promise<MatrixViewData> {
    const res = await apiClient.get<MatrixViewData>(`/evidence/${sessionId}/matrix`)
    return res.data
  },

  async getEvidenceGraph(sessionId: string): Promise<EvidenceGraphData> {
    const res = await apiClient.get<EvidenceGraphData>(`/evidence/${sessionId}/graph`)
    return res.data
  },
}
