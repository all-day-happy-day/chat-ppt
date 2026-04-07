from fastapi import Depends
from sqlalchemy.orm import Session

from app.bible.domain.repository import BibleRepository
from app.bible.infrastructure.repository import AlchemyBibleRepository
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository
from app.powerpoint.infrastructure.repository.template import AlchemyTemplateRepository
from app.powerpoint.infrastructure.repository.template_file import AlchemyTemplateFileRepository
from app.project.domain.repository import ProjectContainerRepository, ProjectRepository
from app.project.infrastructure.repository.project import AlchemyProjectRepository
from app.project.infrastructure.repository.project_container import AlchemyProjectContainerRepository
from app.song.domain.repository import LyricsRepository, SongRepository
from app.song.infrastructure.respository.lyrics.AlchemyLyricsRepository import AlchemyLyricsRepository
from app.song.infrastructure.respository.song.AlchemySongRepository import AlchemySongRepository
from app.user.domain.repository import UserRepository
from app.user.infrastructure.repository.AlchemyUserRepository import AlchemyUserRepository
from core.auth.domain.repository import CredentialsRepository, PrincipalRepository
from core.auth.infrastructure.repository.credentials import AlchemyCredentialsRepository
from core.auth.infrastructure.repository.principal import AlchemyPrincipalRepository
from core.db.db import get_db


# User
def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return AlchemyUserRepository(db)


# Auth
def get_principal_repository(db: Session = Depends(get_db)) -> PrincipalRepository:
    return AlchemyPrincipalRepository(db)


def get_credentials_repository(db: Session = Depends(get_db)) -> CredentialsRepository:
    return AlchemyCredentialsRepository(db)


# Bible
def get_bible_repository() -> BibleRepository:
    return AlchemyBibleRepository()


# Song
def get_song_repository(db: Session = Depends(get_db)) -> SongRepository:
    return AlchemySongRepository(db)


def get_lyrics_repository(db: Session = Depends(get_db)) -> LyricsRepository:
    return AlchemyLyricsRepository(db)


# Powerpoint
def get_template_file_repository(db: Session = Depends(get_db)) -> TemplateFileRepository:
    return AlchemyTemplateFileRepository(db)


def get_template_repository(db: Session = Depends(get_db)) -> TemplateRepository:
    return AlchemyTemplateRepository(db)


# Project
def get_project_repository(db: Session = Depends(get_db)) -> ProjectRepository:
    return AlchemyProjectRepository(db)


def get_project_container_repository(db: Session = Depends(get_db)) -> ProjectContainerRepository:
    return AlchemyProjectContainerRepository(db)
