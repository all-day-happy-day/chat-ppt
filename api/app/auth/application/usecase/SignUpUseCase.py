from datetime import datetime, timezone

from pydantic import EmailStr
from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.enum import Role
from app.user.domain.repository import UserRepository
from core.auth.domain.entity import Principal
from core.auth.domain.repository import PrincipalRepository
from core.auth.domain.service import AuthenticationService, PasswordHasher
from core.auth.domain.valueobject import Credentials


class SignUpUseCase:
    def __init__(
        self,
        auth_service: AuthenticationService,
        principal_repository: PrincipalRepository,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
    ) -> None:
        self.auth_service: AuthenticationService = auth_service
        self.principal_repository: PrincipalRepository = principal_repository
        self.user_repository: UserRepository = user_repository
        self.password_hasher: PasswordHasher = password_hasher

    def __call__(
        self, email: EmailStr, username: str, password: str, role: Role
    ) -> tuple[User, Credentials, Credentials]:
        # Create user
        user: User = User(
            id=ULID(),
            email=email,
            username=username,
            password=self.password_hasher.hash(password),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            last_sign_in=None,
            role=role,
        )
        self.user_repository.save(user=user)

        # Create principal
        principal: Principal = Principal(id=ULID(), user_id=user.id, principal=username, password_hashed=user.password)
        self.principal_repository.save(principal=principal)

        # Create credentials
        short_credentials, long_credentials = self.auth_service.authenticate(principal=username, secret=password)

        return user, short_credentials, long_credentials
