from datetime import datetime, timezone

from app.user.domain.entity import User
from app.user.domain.repository import UserRepository
from core.auth.domain.service import AuthenticationService
from core.auth.domain.valueobject import Credentials


class SignInUseCase:
    def __init__(self, auth_service: AuthenticationService, user_repository: UserRepository) -> None:
        self.auth_service: AuthenticationService = auth_service
        self.user_repository: UserRepository = user_repository

    def __call__(self, principal: str, password: str) -> tuple[User, Credentials, Credentials]:
        short_credentials, long_credentials = self.auth_service.authenticate(principal=principal, secret=password)
        user: User = self.user_repository.get_by_id(user_id=short_credentials.user_id)
        user.last_sign_in = datetime.now(timezone.utc)
        self.user_repository.patch(user=user)
        return user, short_credentials, long_credentials
