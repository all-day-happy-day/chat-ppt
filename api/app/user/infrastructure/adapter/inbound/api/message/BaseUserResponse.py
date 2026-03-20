from typing import Self

from pydantic import BaseModel

from app.user.domain.entity import User


class BaseUserResponse(BaseModel):
    id: str
    username: str

    @classmethod
    def from_domain_entity(cls, user: User) -> Self:
        return cls(id=str(user.id), username=user.username)
