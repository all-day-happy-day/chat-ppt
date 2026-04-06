from sqlalchemy.orm import Session
from ulid import ULID

from app.powerpoint.domain.entity import Shape
from app.powerpoint.domain.exception import ShapeNotFound
from app.powerpoint.domain.repository import ShapeRepository
from app.powerpoint.infrastructure.repository.shape.entity import ShapeAlchemyEntity
from app.powerpoint.infrastructure.repository.shape.mapper import ShapeMapper


class AlchemyShapeRepository(ShapeRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, shape: Shape) -> Shape:
        alchemy_entity: ShapeAlchemyEntity = ShapeMapper.to_alchemy_entity(shape)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return ShapeMapper.to_domain_entity(alchemy_entity)

    def get_by_id(self, id: ULID) -> Shape:
        alchemy_entity: ShapeAlchemyEntity | None = (
            self.db.query(ShapeAlchemyEntity).filter(ShapeAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ShapeNotFound(f"Shape not found: {id}")
        return ShapeMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, id: ULID) -> None:
        alchemy_entity: ShapeAlchemyEntity | None = (
            self.db.query(ShapeAlchemyEntity).filter(ShapeAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ShapeNotFound(f"Shape not found: {id}")
        self.db.delete(alchemy_entity)
        self.db.commit()
