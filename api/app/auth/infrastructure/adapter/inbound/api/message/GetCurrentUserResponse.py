from datetime import datetime

from pydantic import BaseModel, EmailStr
from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.enum import Role


class GetCurrentUserResponse(BaseModel):
    id: ULID
    username: str
    email: EmailStr
    role: Role
    created_at: datetime
    last_sign_in: datetime | None = None

    @staticmethod
    def from_user_entity(user: User) -> "GetCurrentUserResponse":
        return GetCurrentUserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            last_sign_in=user.last_sign_in,
        )
