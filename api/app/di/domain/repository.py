from fastapi import Depends
from sqlalchemy.orm import Session

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
