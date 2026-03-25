from fastapi import Depends  # type: ignore

from app.di.domain.repository import get_credentials_repository, get_principal_repository, get_user_repository
from app.user.domain.repository import UserRepository
from core.auth.domain.repository import CredentialsRepository, PrincipalRepository
from core.auth.domain.service import AuthenticationService, PasswordHasher
from core.auth.infrastructure.service import BcryptPasswordHasher, JWTAuthenticationService


def get_password_hasher() -> PasswordHasher:
    return BcryptPasswordHasher()


def get_authentication_service(
    principal_repository: PrincipalRepository = Depends(get_principal_repository),
    credentials_repository: CredentialsRepository = Depends(get_credentials_repository),
    user_repository: UserRepository = Depends(get_user_repository),
    password_hasher: PasswordHasher = Depends(get_password_hasher),
) -> AuthenticationService:
    return JWTAuthenticationService(
        principal_repository=principal_repository,
        password_hasher=password_hasher,
        credentials_repository=credentials_repository,
        user_repository=user_repository,
    )
