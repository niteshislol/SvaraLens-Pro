import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..schemas import AuditEventDetail
from ..auth.dependencies import get_current_user
from ..audit import query_audit_events

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=List[AuditEventDetail])
def get_audit_trail(
    resource_type: Optional[str] = Query(None, description="Filter by resource type (e.g. Finding, Capsule)"),
    action: Optional[str] = Query(None, description="Filter by action (e.g. REGRESSION_APPROVED)"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves immutable audit trail events strictly scoped to the authenticated caller's organisation.
    Read-only: this endpoint provides no mutation operations."""
    events = query_audit_events(
        db=db,
        org_id=current_user.org_id,
        resource_type=resource_type,
        action=action,
        actor_id=actor_id,
        limit=limit,
        offset=offset
    )

    out = []
    for ev in events:
        try:
            details = json.loads(ev.details_json) if ev.details_json else {}
        except Exception:
            details = {}

        out.append(AuditEventDetail(
            id=ev.id,
            org_id=ev.org_id,
            actor_id=ev.actor_id,
            actor_username=ev.actor_username,
            actor_role=ev.actor_role,
            action=ev.action,
            resource_type=ev.resource_type,
            resource_id=ev.resource_id,
            timestamp=ev.timestamp,
            details=details,
            ip_address=ev.ip_address
        ))
    return out
