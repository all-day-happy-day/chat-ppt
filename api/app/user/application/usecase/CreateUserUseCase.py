from datetime import datetime, timezone

from pydantic import EmailStr
from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.enum import Role
from app.user.domain.repository import UserRepository


class CreateUserUseCase:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository: UserRepository = user_repository

    def __call__(self, email: EmailStr, username: str, password: str, role: Role) -> User:
        user: User = User(
            id=ULID(),
            email=email,
            username=username,
            password=password,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            last_sign_in=None,
            role=role,
        )
        return self.user_repository.save(user)
