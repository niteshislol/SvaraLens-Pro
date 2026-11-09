import json
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Review, ReviewAnnotation, Run
from ..schemas import ReviewCreate, ReviewRead, ReviewAnnotationRead

router = APIRouter(tags=["reviews"])

@router.post("/runs/{id}/reviews", response_model=ReviewRead, status_code=201)
def add_run_review(id: str, review_in: ReviewCreate, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    review_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
    ratings_dict = review_in.ratings.model_dump()

    db_review = Review(
        id=review_id,
        run_id=id,
        reviewer=review_in.reviewer,
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
def get_run_reviews(id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.run_id == id).all()
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
