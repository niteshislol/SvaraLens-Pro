import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Review, ReviewAnnotation, Run, User
from ..schemas import ReviewCreate, ReviewRead, ReviewAnnotationRead
from ..auth.dependencies import get_current_user, require_not_auditor
from ..audit import record_audit_event

router = APIRouter(tags=["reviews"])


@router.post("/runs/{id}/reviews", response_model=ReviewRead, status_code=201)
def add_run_review(
    id: str,
    review_in: ReviewCreate,
    request: Request,
    current_user: User = Depends(require_not_auditor),
    db: Session = Depends(get_db)
):
    """Submits a human review for a run.
    Authoritative identity: reviewer is ALWAYS set to authenticated user.
    Auditors are blocked from creating reviews."""
    run = db.query(Run).filter(Run.id == id, Run.org_id == current_user.org_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    review_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
    ratings_dict = review_in.ratings.model_dump()

    db_review = Review(
        id=review_id,
        org_id=current_user.org_id,
        run_id=id,
        reviewer=current_user.username,
        ratings_json=json.dumps(ratings_dict, ensure_ascii=False)
    )
    db.add(db_review)

    created_annotations = []
    for ann in review_in.annotations:
        ann_id = f"ANN-{uuid.uuid4().hex[:8].upper()}"
        db_ann = ReviewAnnotation(
            id=ann_id,
            review_id=review_id,
            start_s=ann.start_s,
            end_s=ann.end_s,
            tag=ann.tag,
            comment=ann.comment
        )
        db.add(db_ann)
        created_annotations.append(
            ReviewAnnotationRead(
                id=ann_id,
                review_id=review_id,
                start_s=ann.start_s,
                end_s=ann.end_s,
                tag=ann.tag,
                comment=ann.comment
            )
        )

    db.flush()
    record_audit_event(
        db=db,
        actor=current_user,
        action="REVIEW_CREATED",
        resource_type="Review",
        resource_id=review_id,
        details={
            "run_id": run.id,
            "annotations_count": len(created_annotations),
            "ratings": ratings_dict
        },
        request=request
    )
    db.commit()
    db.refresh(db_review)

    return ReviewRead(
        id=db_review.id,
        run_id=db_review.run_id,
        reviewer=db_review.reviewer,
        ratings=ratings_dict,
        annotations=created_annotations,
        created_at=db_review.created_at
    )


@router.get("/runs/{id}/reviews", response_model=List[ReviewRead])
def get_run_reviews(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves reviews strictly for runs within the caller's organisation."""
    run = db.query(Run).filter(Run.id == id, Run.org_id == current_user.org_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    reviews = db.query(Review).filter(Review.run_id == id, Review.org_id == current_user.org_id).all()
    results = []
    for r in reviews:
        ratings = json.loads(r.ratings_json) if r.ratings_json else {}
        annotations = [
            ReviewAnnotationRead(
                id=a.id,
                review_id=a.review_id,
                start_s=a.start_s,
                end_s=a.end_s,
                tag=a.tag,
                comment=a.comment
            ) for a in r.annotations
        ]
        results.append(ReviewRead(
            id=r.id,
            run_id=r.run_id,
            reviewer=r.reviewer,
            ratings=ratings,
            annotations=annotations,
            created_at=r.created_at
        ))
    return results
