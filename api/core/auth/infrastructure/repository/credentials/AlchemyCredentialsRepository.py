from sqlalchemy import Delete, Select, delete, select
from sqlalchemy.orm import Session
from ulid import ULID

from core.auth.domain.enum import CredentialsType
from core.auth.domain.exception import AlchemyMismatch, InvalidCredentials
from core.auth.domain.repository import CredentialsRepository
from core.auth.domain.valueobject import Credentials
from core.auth.infrastructure.repository.credentials.entity import CredentialsAlchemyEntity
from core.auth.infrastructure.repository.credentials.mapper import CredentialsMapper


class AlchemyCredentialsRepository(CredentialsRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, credentials: Credentials) -> Credentials:
        alchemy_entity: CredentialsAlchemyEntity | None = (
            self.db
            .query(CredentialsAlchemyEntity)
            .filter(CredentialsAlchemyEntity.user_id == str(credentials.user_id))
            .first()
        )

        if alchemy_entity is None:
            alchemy_entity = CredentialsMapper.to_alchemy_entity(credentials)
            self.db.add(alchemy_entity)
        else:
            if credentials != CredentialsMapper.to_domain_entity(alchemy_entity):
                raise AlchemyMismatch(f"Credentials not saved: {credentials}")

            if credentials.type == CredentialsType.SHORT_LIVED:
                alchemy_entity.access_key = credentials.raw_value
            elif credentials.type == CredentialsType.LONG_LIVED:
                alchemy_entity.refresh_key = credentials.raw_value
            else:
                raise InvalidCredentials(f"Invalid credentials type: {credentials.type}")

        self.db.commit()

        return credentials

    def exists(self, credentials: Credentials) -> bool:
        stmt: Select[tuple[CredentialsAlchemyEntity]]
        if credentials.type == CredentialsType.SHORT_LIVED:
            stmt = select(CredentialsAlchemyEntity).where(CredentialsAlchemyEntity.access_key == credentials.raw_value)
        elif credentials.type == CredentialsType.LONG_LIVED:
            stmt = select(CredentialsAlchemyEntity).where(CredentialsAlchemyEntity.refresh_key == credentials.raw_value)
        else:
            return False

        result: CredentialsAlchemyEntity | None = self.db.execute(stmt).scalar_one_or_none()
        return result is not None

    def revoke(self, credentials: Credentials) -> None:
        stmt: Delete
        if credentials.type == CredentialsType.SHORT_LIVED:
            stmt = delete(CredentialsAlchemyEntity).where(CredentialsAlchemyEntity.access_key == credentials.raw_value)
        elif credentials.type == CredentialsType.LONG_LIVED:
            stmt = delete(CredentialsAlchemyEntity).where(CredentialsAlchemyEntity.refresh_key == credentials.raw_value)
        else:
            raise InvalidCredentials(f"Invalid credentials type: {credentials.type}")

        self.db.execute(stmt)
        self.db.commit()

    def delete_by_id(self, user_id: ULID) -> None:
        stmt: Delete = delete(CredentialsAlchemyEntity).where(CredentialsAlchemyEntity.user_id == str(user_id))
        self.db.execute(stmt)
        self.db.commit()
