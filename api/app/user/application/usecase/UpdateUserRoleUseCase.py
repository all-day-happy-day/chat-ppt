from datetime import datetime, timezone

from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.enum import Role
from app.user.domain.repository import UserRepository


class UpdateUserRoleUseCase:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository: UserRepository = user_repository

    def __call__(self, user_id: ULID, role: Role) -> User:
        user: User = self.user_repository.get_by_id(user_id)
        user.role = role
        user.updated_at = datetime.now(timezone.utc)
        return self.user_repository.patch(user)
