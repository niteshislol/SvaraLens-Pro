import json
import uuid
from typing import Dict, Any, Optional, List
from fastapi import Request
from sqlalchemy.orm import Session
from .models import AuditEvent, User, utcnow_iso


def record_audit_event(
    db: Session,
    actor: User,
    action: str,
    resource_type: str,
    resource_id: str,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None
) -> AuditEvent:
    """Creates a persistent, immutable audit log entry.
    All events are strictly anchored to the actor's organisation and verified identity."""
    client_ip = None
    if request:
        # Check forwarded headers first if behind reverse proxy
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host

    event = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:10].upper()}",
        org_id=actor.org_id,
        actor_id=actor.id,
        actor_username=actor.username,
        actor_role=actor.role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        timestamp=utcnow_iso(),
        details_json=json.dumps(details or {}, ensure_ascii=False),
        ip_address=client_ip
    )
    db.add(event)
    db.flush()
    return event


def query_audit_events(
    db: Session,
    org_id: str,
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    actor_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[AuditEvent]:
    """Queries persistent audit events strictly isolated to the caller's organisation."""
    q = db.query(AuditEvent).filter(AuditEvent.org_id == org_id)
    if resource_type:
        q = q.filter(AuditEvent.resource_type == resource_type)
    if action:
        q = q.filter(AuditEvent.action == action)
    if actor_id:
        q = q.filter(AuditEvent.actor_id == actor_id)

    return q.order_by(AuditEvent.timestamp.desc()).offset(offset).limit(limit).all()
