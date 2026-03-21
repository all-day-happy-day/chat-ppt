from datetime import datetime, timezone
from typing import Any

from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.repository import UserRepository


class UpdateUserUseCase:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository: UserRepository = user_repository

    def __call__(self, user_id: ULID, update_fields: dict[str, Any]) -> User:
        user_entity: User = self.user_repository.get_by_id(user_id)
        user: User = user_entity.model_copy(update=update_fields)

        has_change: bool = False
        for key, value in user_entity.model_dump().items():
            if value != getattr(user, key):
                has_change = True

        if has_change:
            user.updated_at = datetime.now(timezone.utc)
            return self.user_repository.patch(user)
        return user
