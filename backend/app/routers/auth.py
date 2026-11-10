import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, utcnow_iso
from ..config import settings
from ..schemas import (
    UserLoginRequest, UserRegisterRequest, UserResponse,
    TokenResponse, AdminResetPasswordRequest, ChangePasswordRequest
)
from ..auth.security import (
    hash_password, verify_password, create_access_token,
    VALID_ROLES, ROLE_ADMIN
)
from ..auth.dependencies import (
    get_current_user, require_admin, require_not_auditor
)
from ..audit import record_audit_event

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates user with username/email and password.
    Returns a cryptographically signed Bearer JWT token."""
    login_id = req.username.strip().lower()
    user = db.query(User).filter(
        (User.username.ilike(login_id)) | (User.email.ilike(login_id))
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated. Contact an administrator."
        )

    user.last_login_at = utcnow_iso()
    db.commit()

    token_data = {
        "sub": user.id,
        "username": user.username,
        "org_id": user.org_id,
        "role": user.role
    }
    access_token = create_access_token(token_data)

    # Record login audit event
    record_audit_event(
        db=db,
        actor=user,
        action="AUTH_LOGIN",
        resource_type="User",
        resource_id=user.id,
        details={"username": user.username, "role": user.role},
        request=request
    )
    db.commit()

    user_resp = UserResponse(
        id=user.id,
        org_id=user.org_id,
        username=user.username,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        is_active=bool(user.is_active),
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=user_resp
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    req: UserRegisterRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Registers a new user. Strictly controlled by an authenticated administrator.
    The new user is isolated to the administrator's organisation."""
    target_role = req.role.strip().upper()
    if target_role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{req.role}'. Must be one of: {sorted(list(VALID_ROLES))}"
        )

    username_clean = req.username.strip().lower()
    email_clean = req.email.strip().lower()

    # Check for duplicate username or email
    if db.query(User).filter(User.username.ilike(username_clean)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{req.username}' is already registered."
        )

    if db.query(User).filter(User.email.ilike(email_clean)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{req.email}' is already registered."
        )

    new_user = User(
        id=f"usr-{uuid.uuid4().hex[:10]}",
        org_id=current_user.org_id,
        username=username_clean,
        email=email_clean,
        hashed_password=hash_password(req.password),
        role=target_role,
        full_name=req.full_name,
        is_active=1,
        created_at=utcnow_iso()
    )
    db.add(new_user)
    db.flush()

    record_audit_event(
        db=db,
        actor=current_user,
        action="USER_REGISTERED",
        resource_type="User",
        resource_id=new_user.id,
        details={
            "created_username": new_user.username,
            "created_role": new_user.role,
            "org_id": current_user.org_id
        },
        request=request
    )
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        org_id=new_user.org_id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        full_name=new_user.full_name,
        is_active=bool(new_user.is_active),
        created_at=new_user.created_at,
        last_login_at=new_user.last_login_at
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and active organisation."""
    return UserResponse(
        id=current_user.id,
        org_id=current_user.org_id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        full_name=current_user.full_name,
        is_active=bool(current_user.is_active),
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at
    )


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Terminates session and records audit event."""
    record_audit_event(
        db=db,
        actor=current_user,
        action="AUTH_LOGOUT",
        resource_type="User",
        resource_id=current_user.id,
        details={"username": current_user.username},
        request=request
    )
    db.commit()
    return {"message": "Session terminated successfully."}


@router.post("/admin/reset-password")
def admin_reset_password(
    req: AdminResetPasswordRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator password reset for users within the admin's organisation."""
    target_user = db.query(User).filter(
        User.id == req.user_id,
        User.org_id == current_user.org_id
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your organisation.")

    target_user.hashed_password = hash_password(req.new_password)
    db.flush()

    record_audit_event(
        db=db,
        actor=current_user,
        action="PASSWORD_RESET",
        resource_type="User",
        resource_id=target_user.id,
        details={"reset_by": current_user.username, "target_username": target_user.username},
        request=request
    )
    db.commit()
    return {"message": f"Password reset successfully for user '{target_user.username}'."}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows an authenticated user to change their own password."""
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect.")

    current_user.hashed_password = hash_password(req.new_password)
    db.flush()

    record_audit_event(
        db=db,
        actor=current_user,
        action="PASSWORD_CHANGED",
        resource_type="User",
        resource_id=current_user.id,
        details={"username": current_user.username},
        request=request
    )
    db.commit()
    return {"message": "Password updated successfully."}


@router.get("/users", response_model=List[UserResponse])
def list_organisation_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists users strictly within the caller's organisation."""
    users = db.query(User).filter(User.org_id == current_user.org_id).all()
    return [
        UserResponse(
            id=u.id,
            org_id=u.org_id,
            username=u.username,
            email=u.email,
            role=u.role,
            full_name=u.full_name,
            is_active=bool(u.is_active),
            created_at=u.created_at,
            last_login_at=u.last_login_at
        )
        for u in users
    ]
