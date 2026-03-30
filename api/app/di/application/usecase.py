from fastapi import Depends

from app.auth.application.usecase import (
    RefreshCredentialsUseCase,
    SignInUseCase,
    SignOutUseCase,
    SignUpUseCase,
    VerifyCredentialsUseCase,
    VerifyPasswordUseCase,
)
from app.bible.application.usecase import GetBiblePhraseUseCase
from app.bible.domain.repository import BibleRepository
from app.di.domain.repository import (
    get_bible_repository,
    get_credentials_repository,
    get_principal_repository,
    get_user_repository,
)
from app.di.domain.service import get_authentication_service, get_password_hasher
from app.user.application.usecase import (
    CreateUserUseCase,
    DeleteUserUseCase,
    GetUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
)
from app.user.domain.repository import UserRepository
from core.auth.domain.repository import CredentialsRepository, PrincipalRepository
from core.auth.domain.service import AuthenticationService, PasswordHasher


# User
def get_create_user_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> CreateUserUseCase:
    return CreateUserUseCase(user_repository=user_repository)


def get_delete_user_use_case(
    user_repository: UserRepository = Depends(get_user_repository),
    credentials_repository: CredentialsRepository = Depends(get_credentials_repository),
    principal_repository: PrincipalRepository = Depends(get_principal_repository),
) -> DeleteUserUseCase:
    return DeleteUserUseCase(
        user_repository=user_repository,
        credentials_repository=credentials_repository,
        principal_repository=principal_repository,
    )


def get_get_users_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> GetUsersUseCase:
    return GetUsersUseCase(user_repository=user_repository)


def get_get_user_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> GetUserUseCase:
    return GetUserUseCase(user_repository=user_repository)


def get_update_user_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> UpdateUserUseCase:
    return UpdateUserUseCase(user_repository=user_repository)


# Auth
def get_sign_in_use_case(
    auth_service: AuthenticationService = Depends(get_authentication_service),
    user_repository: UserRepository = Depends(get_user_repository),
) -> SignInUseCase:
    return SignInUseCase(auth_service=auth_service, user_repository=user_repository)


def get_sign_out_use_case(
    auth_service: AuthenticationService = Depends(get_authentication_service),
    user_repository: UserRepository = Depends(get_user_repository),
) -> SignOutUseCase:
    return SignOutUseCase(auth_service=auth_service, user_repository=user_repository)


def get_sign_up_use_case(
    auth_service: AuthenticationService = Depends(get_authentication_service),
    principal_repository: PrincipalRepository = Depends(get_principal_repository),
    user_repository: UserRepository = Depends(get_user_repository),
    password_hasher: PasswordHasher = Depends(get_password_hasher),
) -> SignUpUseCase:
    return SignUpUseCase(
        auth_service=auth_service,
        principal_repository=principal_repository,
        user_repository=user_repository,
        password_hasher=password_hasher,
    )


def get_verify_credentials_use_case(
    auth_service: AuthenticationService = Depends(get_authentication_service),
    user_repository: UserRepository = Depends(get_user_repository),
) -> VerifyCredentialsUseCase:
    return VerifyCredentialsUseCase(auth_service=auth_service, user_repository=user_repository)


def get_verify_password_use_case(
    principal_repository: PrincipalRepository = Depends(get_principal_repository),
    password_hasher: PasswordHasher = Depends(get_password_hasher),
) -> VerifyPasswordUseCase:
    return VerifyPasswordUseCase(principal_repository=principal_repository, password_hasher=password_hasher)


def get_refresh_credentials_use_case(
    auth_service: AuthenticationService = Depends(get_authentication_service),
) -> RefreshCredentialsUseCase:
    return RefreshCredentialsUseCase(auth_service=auth_service)


# Bible
def get_get_bible_phrase_use_case(
    bible_repository: BibleRepository = Depends(get_bible_repository),
) -> GetBiblePhraseUseCase:
    return GetBiblePhraseUseCase(bible_repository=bible_repository)
