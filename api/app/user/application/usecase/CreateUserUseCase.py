from datetime import datetime, timezone

from pydantic import EmailStr
from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.enum import Role
from app.user.domain.repository import UserRepository
from core.util import BCryptPasswordHasher


class CreateUserUseCase:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository: UserRepository = user_repository
        self.ulid: ULID = ULID()
        self.password_hasher: BCryptPasswordHasher = BCryptPasswordHasher()

    def __call__(self, email: EmailStr, username: str, password: str, role: Role) -> User:
        user: User = User(
            id=self.ulid,
            email=email,
            username=username,
            password=self.password_hasher.hash(password),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            last_sign_in=None,
            role=role,
        )
        return self.user_repository.save(user)
