from pydantic import BaseModel, EmailStr

from app.user.domain.enum import Role


class SignUpRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: Role = Role.USER
