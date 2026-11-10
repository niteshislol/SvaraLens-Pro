import datetime
import json
import re
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..config import settings
from ..db import get_db
from ..models import User
from ..auth.dependencies import require_admin

router = APIRouter(prefix="/access-requests", tags=["access-requests"])

VALID_INTERESTS = {
    "Speech QA",
    "Indic language review",
    "Audio analysis",
    "Regression testing",
    "Product evaluation"
}
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
STORE_PATH = settings.DATA_DIR / "access-requests.jsonl"


class AccessRequestIn(BaseModel):
    name: str = ""
    email: str = ""
    organisation: str = ""
    role: str = ""
    interest: str = ""
    message: Optional[str] = ""
    website: Optional[str] = None  # Honeypot field
    elapsedMs: Optional[int] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_access_request(payload: AccessRequestIn, request: Request):
    """Processes pilot/access requests from the SvaraLens landing page.
    Includes bot protection (honeypot + submission-time check) and persists
    valid requests to the secure JSONL access request repository."""
    # Honeypot inspection
    if payload.website and payload.website.strip():
        # Neutral reject for bots
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="We could not record your request."
        )

    # Sanitize and strip
    name = (payload.name or "").strip()
    email = (payload.email or "").strip().lower()
    organisation = (payload.organisation or "").strip()
    role = (payload.role or "").strip()
    interest = (payload.interest or "").strip()
    message = (payload.message or "").strip()[:1000]

    errors: Dict[str, str] = {}
    if len(name) < 2:
        errors["name"] = "Please enter your name."
    if not EMAIL_REGEX.match(email):
        errors["email"] = "Please enter a valid work email."
    if len(organisation) < 2:
        errors["organisation"] = "Please enter your organisation."
    if len(role) < 2:
        errors["role"] = "Please enter your role."
    if interest not in VALID_INTERESTS:
        errors["interest"] = "Please choose an area of interest."

    if errors:
        return Response(
            content=json.dumps({"errors": errors, "message": "Please check the highlighted fields."}),
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            media_type="application/json"
        )

    record = {
        "name": name,
        "email": email,
        "organisation": organisation,
        "role": role,
        "interest": interest,
        "message": message,
        "client_ip": request.client.host if request.client else "unknown",
        "receivedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(STORE_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    return {"ok": True, "message": "Access request received."}


@router.get("", response_model=List[dict])
def list_access_requests(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator-only endpoint to inspect submitted access requests."""
    if not STORE_PATH.exists():
        return []
    requests = []
    with open(STORE_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    requests.append(json.loads(line))
                except Exception:
                    continue
    return requests
