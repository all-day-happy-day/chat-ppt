from sqlalchemy import Delete, delete
from sqlalchemy.orm import Session
from ulid import ULID

from core.auth.domain.entity import Principal
from core.auth.domain.exception import DuplicatedPrincipal, PrincipalNotFound
from core.auth.domain.repository import PrincipalRepository
from core.auth.infrastructure.repository.principal.entity import PrincipalAlchemyEntity
from core.auth.infrastructure.repository.principal.mapper import PrincipalMapper


class AlchemyPrincipalRepository(PrincipalRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, principal: Principal) -> Principal:
        alchemy_entity: PrincipalAlchemyEntity | None = (
            self.db
            .query(PrincipalAlchemyEntity)
            .filter(PrincipalAlchemyEntity.principal == principal.principal)
            .first()
        )

        if alchemy_entity is None:
            alchemy_entity = PrincipalMapper.to_alchemy_entity(principal)
            self.db.add(alchemy_entity)
        else:
            raise DuplicatedPrincipal(f"Principal already exists: {principal}")

        self.db.commit()

        return principal

    def exists(self, principal: str) -> bool:
        return (
            self.db.query(PrincipalAlchemyEntity).filter(PrincipalAlchemyEntity.principal == principal).first()
            is not None
        )

    def get_by_principal(self, principal: str) -> Principal:
        alchemy_entity: PrincipalAlchemyEntity | None = (
            self.db.query(PrincipalAlchemyEntity).filter(PrincipalAlchemyEntity.principal == principal).first()
        )
        if alchemy_entity is None:
            raise PrincipalNotFound(f"Principal not found: {principal}")

        return PrincipalMapper.to_domain_entity(alchemy_entity)

    def get_by_user_id(self, user_id: ULID) -> Principal:
        alchemy_entity: PrincipalAlchemyEntity | None = (
            self.db.query(PrincipalAlchemyEntity).filter(PrincipalAlchemyEntity.user_id == user_id).first()
        )
        if alchemy_entity is None:
            raise PrincipalNotFound(f"Principal not found: {user_id}")

        return PrincipalMapper.to_domain_entity(alchemy_entity)

    def delete_by_user_id(self, user_id: ULID) -> None:
        stmt: Delete = delete(PrincipalAlchemyEntity).where(PrincipalAlchemyEntity.user_id == str(user_id))
        self.db.execute(stmt)
        self.db.commit()
