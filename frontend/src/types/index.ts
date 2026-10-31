export interface ResearchSessionSummary {
  id: string
  title: string
  research_goal: string
  target_decision?: string
  status: "draft" | "processing" | "completed" | "failed"
  readiness_score: number
  coverage_score: number
  consistency_score: number
  freshness_score: number
  verification_score: number
  source_count: number
  requirement_count: number
  conflict_count: number
  blindspot_count: number
  created_at: string
  updated_at: string
}

export interface ResearchSessionResponse extends ResearchSessionSummary {
  executive_verdict?: string
}

export interface SourceChunkItem {
  id: string
  chunk_index: number
  text_content: string
  page_number?: number
  start_char?: number
  end_char?: number
  token_count: number
}

export interface SourceItem {
  id: string
  session_id: string
  source_type: "pdf" | "url" | "text"
  title: string
  uri?: string
  domain?: string
  publication_date?: string
  last_modified_date?: string
  extraction_timestamp?: string
  author_or_publisher?: string
  processing_status?: "pending" | "processing" | "processed" | "failed"
  error_details?: string
  content_hash?: string
  word_count?: number
  char_count?: number
  chunk_count: number
  created_at: string
  cleaned_content?: string
  raw_content?: string
  metadata_json?: string
  chunks?: SourceChunkItem[]
}

export interface BatchIngestionResponse {
  sources: SourceItem[]
  total_submitted: number
  total_successful: number
  total_failed: number
}

export interface RequirementItem {
  id: string
  session_id: string
  requirement_text: string
  question?: string
  description?: string
  category: string
  importance?: "critical" | "high" | "medium" | "low" | string
  priority?: "P0" | "P1" | "P2" | "P3" | string
  weight: number
  is_decision_critical: boolean
  origin: "user_requested" | "ai_suggested" | string
  is_approved: boolean
  status: "covered" | "partial" | "uncovered" | "conflict" | string
  order_index: number
  created_at: string
  evidence_count: number
  conflict_count: number
}

export interface ResearchPlanSummary {
  session_id: string
  total_requirements: number
  official_approved_count: number
  ai_suggested_count: number
  decision_critical_count: number
  categories: string[]
  requirements: RequirementItem[]
}

export interface AtomicClaimItem {
  id: string
  chunk_id: string
  source_id: string
  source_title: string
  source_type: string
  page_number?: number
  claim_text: string
  exact_quote: string
  claim_type: string
  date_reference?: string
  confidence_score: number
  is_verified: boolean
}

export interface ClaimSnippet {
  id: string
  source_id: string
  source_title: string
  source_type: string
  page_number?: number
  claim_text: string
  exact_quote: string
  date_reference?: string
  confidence_score: number
}

export interface ContradictionItem {
  id: string
  session_id: string
  requirement_id?: string
  requirement_text?: string
  severity: "high" | "medium" | "low"
  conflicting_aspect: string
  synthesis_verdict?: string
  claim_a: ClaimSnippet
  claim_b: ClaimSnippet
  created_at: string
}

export interface InformationGapItem {
  requirement_id: string
  requirement_text: string
  category: string
  status: string
  gap_summary: string
  missing_aspects: string[]
  impact_level: "high" | "medium" | "low"
  suggested_action: string
}

export interface TemporalAuditItem {
  source_id: string
  source_title: string
  publication_date?: string
  age_in_months?: number
  status: "fresh" | "aging" | "outdated" | "unknown"
  decay_warning?: string
  stale_claims: ClaimSnippet[]
}

export interface BlindSpotItem {
  id: string
  session_id: string
  question: string
  rationale: string
  risk_level: "high" | "medium" | "low"
  category: string
  is_resolved: boolean
  created_at: string
}

export interface FlowNodeData {
  label: string
  node_type: "goal" | "requirement" | "claim" | "source" | "evidence" | "gap" | "contradiction" | "blindspot"
  status?: string
  severity?: string
  quote?: string
  source_name?: string
  page?: number
  url?: string
  meta?: Record<string, any>
}

export interface FlowNode {
  id: string
  type: string
  data: FlowNodeData
  position: { x: number; y: number }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
  style?: Record<string, any>
}

export interface EvidenceGraphData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface MatrixCell {
  requirement_id: string
  source_id: string
  claim_count: number
  has_conflict: boolean
  status: "supported" | "partial" | "empty" | "conflict"
  claims: AtomicClaimItem[]
}

export interface MatrixViewData {
  requirements: Array<{ id: string; text: string; category: string; status: string }>
  sources: Array<{ id: string; title: string; type: string }>
  cells: MatrixCell[]
}

export interface SSEProgressPayload {
  session_id: string
  stage: string
  progress: number
  message: string
  data?: Record<string, any>
}
