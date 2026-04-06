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
from app.di.domain.port import get_template_file_storage_port
from app.di.domain.repository import (
    get_bible_repository,
    get_credentials_repository,
    get_lyrics_repository,
    get_principal_repository,
    get_song_repository,
    get_template_file_repository,
    get_template_repository,
    get_user_repository,
)
from app.di.domain.service import (
    get_authentication_service,
    get_bugs_lyrics_fetcher_service,
    get_password_hasher,
    get_template_read_service,
)
from app.powerpoint.application.usecase import (
    GetLayoutsUseCase,
    GetTemplatesByUserIDUseCase,
    ReadTemplateUseCase,
    UpdateTemplateUseCase,
)
from app.powerpoint.domain.port.outbound import TemplateFileStoragePort
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository
from app.powerpoint.domain.service import TemplateReadService
from app.song.application.usecase import (
    DeleteSongUseCase,
    GetLyricsUseCase,
    GetSongsUseCase,
    PatchLyricsUseCase,
    PatchSongUseCase,
    ScrapLyricsUseCase,
)
from app.song.domain.repository import LyricsRepository, SongRepository
from app.song.domain.service import LyricsFetcherService
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


# Song
def get_delete_song_use_case(
    song_repository: SongRepository = Depends(get_song_repository),
    lyrics_repository: LyricsRepository = Depends(get_lyrics_repository),
) -> DeleteSongUseCase:
    return DeleteSongUseCase(song_repository=song_repository, lyrics_repository=lyrics_repository)


def get_get_lyrics_use_case(
    lyrics_repository: LyricsRepository = Depends(get_lyrics_repository),
    song_repository: SongRepository = Depends(get_song_repository),
) -> GetLyricsUseCase:
    return GetLyricsUseCase(lyrics_repository=lyrics_repository, song_repository=song_repository)


def get_get_songs_use_case(
    song_repository: SongRepository = Depends(get_song_repository),
) -> GetSongsUseCase:
    return GetSongsUseCase(song_repository=song_repository)


def get_patch_lyrics_use_case(
    lyrics_repository: LyricsRepository = Depends(get_lyrics_repository),
) -> PatchLyricsUseCase:
    return PatchLyricsUseCase(lyrics_repository=lyrics_repository)


def get_patch_song_use_case(
    song_repository: SongRepository = Depends(get_song_repository),
) -> PatchSongUseCase:
    return PatchSongUseCase(song_repository=song_repository)


def get_scrap_lyrics_use_case(
    lyrics_repository: LyricsRepository = Depends(get_lyrics_repository),
    song_repository: SongRepository = Depends(get_song_repository),
    lyrics_fetcher_service: LyricsFetcherService = Depends(get_bugs_lyrics_fetcher_service),
) -> ScrapLyricsUseCase:
    return ScrapLyricsUseCase(
        lyrics_repository=lyrics_repository,
        song_repository=song_repository,
        lyrics_fetcher_service=lyrics_fetcher_service,
    )


# Powerpoint
def get_get_layouts_use_case(
    template_repository: TemplateRepository = Depends(get_template_repository),
) -> GetLayoutsUseCase:
    return GetLayoutsUseCase(template_repository=template_repository)


def get_get_templates_by_user_id_use_case(
    template_file_repository: TemplateFileRepository = Depends(get_template_file_repository),
    template_repository: TemplateRepository = Depends(get_template_repository),
) -> GetTemplatesByUserIDUseCase:
    return GetTemplatesByUserIDUseCase(
        template_file_repository=template_file_repository, template_repository=template_repository
    )


def get_read_template_use_case(
    template_file_storage_port: TemplateFileStoragePort = Depends(get_template_file_storage_port),
    template_read_service: TemplateReadService = Depends(get_template_read_service),
    template_file_repository: TemplateFileRepository = Depends(get_template_file_repository),
    template_repository: TemplateRepository = Depends(get_template_repository),
) -> ReadTemplateUseCase:
    return ReadTemplateUseCase(
        template_file_storage_port=template_file_storage_port,
        template_read_service=template_read_service,
        template_file_repository=template_file_repository,
        template_repository=template_repository,
    )


def get_update_template_use_case(
    template_file_storage_port: TemplateFileStoragePort = Depends(get_template_file_storage_port),
    template_read_service: TemplateReadService = Depends(get_template_read_service),
    template_file_repository: TemplateFileRepository = Depends(get_template_file_repository),
    template_repository: TemplateRepository = Depends(get_template_repository),
) -> UpdateTemplateUseCase:
    return UpdateTemplateUseCase(
        template_file_storage_port=template_file_storage_port,
        template_read_service=template_read_service,
        template_file_repository=template_file_repository,
        template_repository=template_repository,
    )
