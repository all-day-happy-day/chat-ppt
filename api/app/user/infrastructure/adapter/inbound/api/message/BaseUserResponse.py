from typing import Self

from pydantic import BaseModel

from app.user.domain.entity import User
from app.user.domain.enum import Role


class BaseUserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: Role

    @classmethod
    def from_domain_entity(cls, user: User) -> Self:
        return cls(
            id=str(user.id),
            username=user.username,
            email=str(user.email),
            role=user.role,
        )
