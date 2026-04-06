from sqlalchemy.orm import Session
from ulid import ULID

from app.powerpoint.domain.entity import Layout
from app.powerpoint.domain.exception import LayoutNotFound
from app.powerpoint.domain.repository import LayoutRepository
from app.powerpoint.infrastructure.repository.layout.entity import LayoutAlchemyEntity
from app.powerpoint.infrastructure.repository.layout.mapper import LayoutMapper


class AlchemyLayoutRepository(LayoutRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, layout: Layout) -> Layout:
        alchemy_entity: LayoutAlchemyEntity = LayoutMapper.to_alchemy_entity(layout)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return LayoutMapper.to_domain_entity(alchemy_entity)

    def get_by_id(self, id: ULID) -> Layout:
        alchemy_entity: LayoutAlchemyEntity | None = (
            self.db.query(LayoutAlchemyEntity).filter(LayoutAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise LayoutNotFound(f"Layout not found: {id}")
        return LayoutMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, id: ULID) -> None:
        alchemy_entity: LayoutAlchemyEntity | None = (
            self.db.query(LayoutAlchemyEntity).filter(LayoutAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise LayoutNotFound(f"Layout not found: {id}")
        self.db.delete(alchemy_entity)
        self.db.commit()
