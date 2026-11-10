from typing import Optional, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from .security import decode_access_token, ROLE_ADMIN, ROLE_QA_LEAD, ROLE_AUDITOR

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Authenticates the incoming request using a Bearer JWT token.
    Enforces token validity, expiry, and active user status."""
    if not token:
        # Check direct Authorization header fallback
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please provide a valid Bearer token.",
                headers={"WWW-Authenticate": "Bearer"}
            )

    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: missing subject identifier.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter((User.id == user_id) | (User.username == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Factory dependency: enforces that the authenticated user possesses one of the allowed roles.
    Raises HTTP 403 Forbidden if unauthorized."""
    def role_verifier(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{current_user.role}' lacks permission for this action. Allowed: {list(allowed_roles)}"
            )
        return current_user
    return role_verifier


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforces ADMIN role."""
    if current_user.role != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required."
        )
    return current_user


def require_lead_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforces QA_LEAD or ADMIN role (required for regression approvals and sign-offs)."""
    if current_user.role not in (ROLE_ADMIN, ROLE_QA_LEAD):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only QA Lead or Administrator may approve regressions and sign off on defect resolutions."
        )
    return current_user


def require_not_auditor(current_user: User = Depends(get_current_user)) -> User:
    """Blocks AUDITOR role from performing any mutating state transitions."""
    if current_user.role == ROLE_AUDITOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Auditor role has strictly read-only access. Mutation operations are prohibited."
        )
    return current_user
