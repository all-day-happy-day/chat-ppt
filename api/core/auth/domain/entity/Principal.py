from pydantic import BaseModel, Field
from ulid import ULID

from core.auth.domain.service import PasswordHasher


class Principal(BaseModel):
    id: ULID = Field(description="Unique domain identifier")
    user_id: ULID = Field(description="Unique user domain identifier")
    principal: str = Field(description="Login principal, e.g. username or email")
    password_hashed: str = Field(description="Stored password hash")

    def verify_password(self, plain: str, hasher: PasswordHasher) -> bool:
        return hasher.verify(plain=plain, hashed=self.password_hashed)
