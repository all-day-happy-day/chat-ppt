from pydantic import EmailStr
from ulid import ULID

from app.user.application.usecase import CreateUserUseCase
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
        self.create_user_use_case: CreateUserUseCase = CreateUserUseCase(user_repository=user_repository)

    def __call__(
        self, email: EmailStr, username: str, password: str, role: Role
    ) -> tuple[User, Credentials, Credentials]:
        # Create user
        user: User = self.create_user_use_case(email=email, username=username, password=password, role=role)

        # Create principal
        principal: Principal = Principal(id=ULID(), user_id=user.id, principal=username, password_hashed=user.password)
        self.principal_repository.save(principal=principal)

        # Create credentials
        short_credentials, long_credentials = self.auth_service.authenticate(principal=username, secret=password)

        return user, short_credentials, long_credentials
