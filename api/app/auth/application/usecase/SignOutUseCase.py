from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.repository import UserRepository
from core.auth.domain.service import AuthenticationService


class SignOutUseCase:
    def __init__(self, auth_service: AuthenticationService, user_repository: UserRepository) -> None:
        self.auth_service: AuthenticationService = auth_service
        self.user_repository: UserRepository = user_repository

    def __call__(self, raw_short_lived_credentials: str, raw_long_lived_credentials: str | None = None) -> User:
        user_id: ULID = self.auth_service.verify(raw_short_lived_credentials=raw_short_lived_credentials)
        self.auth_service.revoke(raw_short_lived_credentials)
        if raw_long_lived_credentials is not None:
            self.auth_service.revoke(raw_long_lived_credentials)
        user: User = self.user_repository.get_by_id(user_id=user_id)
        return user
