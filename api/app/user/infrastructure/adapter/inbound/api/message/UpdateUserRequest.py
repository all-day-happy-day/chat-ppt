from pydantic import BaseModel, EmailStr

from app.user.domain.enum import Role


class UpdateUserRequest(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    password: str | None = None
    role: Role | None = None
