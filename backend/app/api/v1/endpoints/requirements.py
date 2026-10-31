from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, Requirement, EvidenceLink, Contradiction
from app.schemas.requirements import (
    RequirementCreate,
    RequirementUpdate,
    RequirementResponse,
)
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Requirements"])


@router.get("/research/{research_id}/requirements", response_model=List[RequirementResponse])
@router.get("/requirements/{research_id}", response_model=List[RequirementResponse])
def get_research_requirements(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    reqs = db.query(Requirement).filter(Requirement.session_id == research_id).order_by(Requirement.order_index).all()
    results = []
    for r in reqs:
        ev_count = db.query(EvidenceLink).filter(EvidenceLink.requirement_id == r.id).count()
        conf_count = db.query(Contradiction).filter(Contradiction.requirement_id == r.id).count()
        results.append(
            RequirementResponse(
                id=r.id,
                session_id=r.session_id,
                requirement_text=r.requirement_text,
                category=r.category,
                weight=r.weight,
                status=r.status,
                order_index=r.order_index,
                created_at=r.created_at,
                evidence_count=ev_count,
                conflict_count=conf_count
            )
        )
    return results


@router.post("/research/{research_id}/requirements", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
def create_requirement(
    research_id: str,
    data: RequirementCreate,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    max_order = db.query(Requirement).filter(Requirement.session_id == research_id).count()

    req = Requirement(
        session_id=research_id,
        requirement_text=data.requirement_text,
        category=data.category,
        weight=data.weight,
        status="uncovered",
        order_index=max_order
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return RequirementResponse(
        id=req.id,
        session_id=req.session_id,
        requirement_text=req.requirement_text,
        category=req.category,
        weight=req.weight,
        status=req.status,
        order_index=req.order_index,
        created_at=req.created_at,
        evidence_count=0,
        conflict_count=0
    )


@router.patch("/requirements/{requirement_id}", response_model=RequirementResponse)
def patch_requirement(
    requirement_id: str,
    data: RequirementUpdate,
    db: Session = Depends(get_db)
):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise NotFoundError("Requirement", requirement_id)

    if data.requirement_text is not None:
        req.requirement_text = data.requirement_text
    if data.category is not None:
        req.category = data.category
    if data.weight is not None:
        req.weight = data.weight
    if data.status is not None:
        req.status = data.status

    db.commit()
    db.refresh(req)

    ev_count = db.query(EvidenceLink).filter(EvidenceLink.requirement_id == req.id).count()
    conf_count = db.query(Contradiction).filter(Contradiction.requirement_id == req.id).count()

    return RequirementResponse(
        id=req.id,
        session_id=req.session_id,
        requirement_text=req.requirement_text,
        category=req.category,
        weight=req.weight,
        status=req.status,
        order_index=req.order_index,
        created_at=req.created_at,
        evidence_count=ev_count,
        conflict_count=conf_count
    )


@router.delete("/requirements/{requirement_id}", status_code=status.HTTP_200_OK)
def delete_requirement(requirement_id: str, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise NotFoundError("Requirement", requirement_id)
    db.delete(req)
    db.commit()
    return {"success": True, "message": f"Requirement '{requirement_id}' successfully deleted."}
