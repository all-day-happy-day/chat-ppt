from datetime import datetime, timezone
from typing import Any

from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.exception import UnauthorizedRequest
from app.user.domain.repository import UserRepository
from core.auth.domain.service import PasswordHasher


class UpdateUserUseCase:
    def __init__(self, user_repository: UserRepository, password_hasher: PasswordHasher) -> None:
        self.user_repository: UserRepository = user_repository
        self.password_hasher: PasswordHasher = password_hasher

    def __call__(self, user_id: ULID, update_fields: dict[str, Any]) -> User:
        user_entity: User = self.user_repository.get_by_id(user_id)
        prepared: dict[str, Any] = dict(update_fields)
        if "role" in prepared:
            raise UnauthorizedRequest("Cannot update role of another user.")
        user: User = user_entity.model_copy(update=prepared)

        has_change: bool = False
        for key, value in user_entity.model_dump().items():
            if value != getattr(user, key):
                has_change = True

        if has_change:
            user.updated_at = datetime.now(timezone.utc)
            return self.user_repository.patch(user)
        return user
