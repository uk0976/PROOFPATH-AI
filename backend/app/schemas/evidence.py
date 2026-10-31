from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AtomicClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_id: str
    source_id: str
    source_title: str
    source_type: str
    page_number: Optional[int]
    claim_text: str
    exact_quote: str
    claim_type: str
    date_reference: Optional[str]
    confidence_score: float
    is_verified: bool


class EvidenceLinkResponse(BaseModel):
    id: str
    requirement_id: str
    requirement_text: str
    claim: AtomicClaimResponse
    relation_type: str  # supports, refutes, partial, neutral
    relevance_rationale: Optional[str]
    similarity_score: float


# React Flow Node & Edge Schemas
class FlowNodeData(BaseModel):
    label: str
    node_type: str  # goal, requirement, claim, evidence, source, gap, contradiction, blindspot
    status: Optional[str] = None
    severity: Optional[str] = None
    quote: Optional[str] = None
    source_name: Optional[str] = None
    page: Optional[int] = None
    url: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class FlowNode(BaseModel):
    id: str
    type: str  # default, input, output, or custom node types
    data: FlowNodeData
    position: Dict[str, float]  # { "x": float, "y": float }


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: Optional[bool] = False
    style: Optional[Dict[str, Any]] = None


class EvidenceGraphResponse(BaseModel):
    nodes: List[FlowNode]
    edges: List[FlowEdge]


class MatrixCell(BaseModel):
    requirement_id: str
    source_id: str
    claim_count: int
    has_conflict: bool
    status: str  # supported, partial, empty, conflict
    claims: List[AtomicClaimResponse] = []


class MatrixViewResponse(BaseModel):
    requirements: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    cells: List[MatrixCell]
