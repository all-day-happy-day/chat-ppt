from pydantic import BaseModel, EmailStr


class UpdateUserRequest(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    password: str | None = None
