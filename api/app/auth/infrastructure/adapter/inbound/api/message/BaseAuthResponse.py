from typing import Self

from pydantic import BaseModel

from app.user.domain.entity import User


class BaseAuthResponse(BaseModel):
    username: str

    @classmethod
    def from_user_entity(cls, user: User) -> Self:
        return cls(
            username=user.username,
        )
