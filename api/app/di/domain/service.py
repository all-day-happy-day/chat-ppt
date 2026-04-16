from fastapi import Depends  # type: ignore

from app.bible.domain.service import ParseVerseQueryService as P
from app.di.domain.repository import (
    get_credentials_repository,
    get_principal_repository,
    get_user_repository,
)
from app.powerpoint.domain.service import TemplateFileStorageService, TemplateReadService
from app.powerpoint.infrastructure.service import LocalDiskTemplateFileService, PPTXTemplateReadService
from app.project.domain.service import PresentationService
from app.project.infrastructure.service import PPTXPresentationService
from app.song.domain.service import LyricsFetcherService
from app.song.infrastructure.service import BugsLyricsFetcherService
from app.user.domain.repository import UserRepository
from core.auth.domain.repository import CredentialsRepository, PrincipalRepository
from core.auth.domain.service import AuthenticationService, PasswordHasher
from core.auth.infrastructure.service import BcryptPasswordHasher, JWTAuthenticationService


# Auth
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


# Bible
def get_parse_verse_query_service() -> P.ParseVerseQueryService:
    return P.ParseVerseQueryService()


# Song
def get_bugs_lyrics_fetcher_service() -> LyricsFetcherService:
    return BugsLyricsFetcherService()


# Powerpoint
def get_template_read_service() -> TemplateReadService:
    return PPTXTemplateReadService()


def get_template_file_storage_service() -> TemplateFileStorageService:
    return LocalDiskTemplateFileService()


# Project
def get_presentation_service() -> PresentationService:
    return PPTXPresentationService()
