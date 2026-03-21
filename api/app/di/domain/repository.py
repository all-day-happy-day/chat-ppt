from fastapi import Depends
from sqlalchemy.orm import Session

from app.user.domain.repository import UserRepository
from app.user.infrastructure.repository.AlchemyUserRepository import AlchemyUserRepository
from core.db.db import get_db


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return AlchemyUserRepository(db)
