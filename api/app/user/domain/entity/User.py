from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator
from ulid import ULID

from app.user.domain.enum import Role


class User(BaseModel):
    id: ULID = Field(default_factory=ULID)
    email: EmailStr
    username: str
    password: str
    created_at: datetime
    updated_at: datetime
    last_sign_in: datetime | None = Field(default=None)
    role: Role = Field(default=Role.USER)

    @model_validator(mode="after")
    def validate_username(self) -> "User":
        if "@" in self.username:
            raise ValueError("Invalid username. Username cannot contain '@'.")
        return self
