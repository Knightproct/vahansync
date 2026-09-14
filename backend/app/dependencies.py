from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .config import get_settings
from .models import User
from .security import decode_access_token, decode_supabase_token, decode_token_version

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), database: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    try:
        settings = get_settings()
        if settings.auth_provider == "supabase":
            claims = decode_supabase_token(token)
            subject = str(claims["sub"])
            email = str(claims.get("email", "")).lower()
            user = database.scalar(select(User).where(User.supabase_user_id == subject))
            if user is None and email:
                user = database.scalar(select(User).where(User.email == email))
                if user is not None:
                    user.supabase_user_id = subject
                    database.commit()
        else:
            user_id = decode_access_token(token)
            token_version = decode_token_version(token)
            user = database.get(User, user_id)
            if user is None or user.token_version != token_version:
                raise credentials_error
        if user is None:
            raise credentials_error
        return user
    except Exception as error:
        raise credentials_error from error


def require_roles(*roles: str):
    allowed_roles = set(roles)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


ROLE_PERMISSIONS = {
    "owner": {"*"},
    "admin": {"admin", "fleet", "workshop", "inventory", "finance", "compliance", "procurement", "notifications"},
    "manager": {"fleet", "maintenance", "workshop", "inventory", "finance", "compliance", "procurement", "notifications"},
    "fleet_manager": {"fleet", "maintenance", "compliance", "notifications"},
    "workshop_manager": {"maintenance", "workshop", "inventory", "notifications"},
    "inventory_manager": {"inventory", "procurement", "notifications"},
    "driver": {"driver", "fleet", "notifications"},
    "technician": {"maintenance", "workshop", "inventory", "notifications"},
    "accountant": {"finance", "procurement", "notifications"},
    "compliance_officer": {"compliance", "notifications"},
    "operator": {"fleet", "maintenance", "compliance", "notifications"},
}


def require_permission(permission: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        permissions = ROLE_PERMISSIONS.get(user.role, set())
        if "*" not in permissions and permission not in permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role {user.role} cannot access {permission}")
        return user

    return dependency
