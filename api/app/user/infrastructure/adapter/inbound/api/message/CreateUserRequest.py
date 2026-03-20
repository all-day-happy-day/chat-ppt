from pydantic import BaseModel, EmailStr

from app.user.domain.enum import Role


class CreateUserRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: Role
