import json

from ulid import ULID

from app.powerpoint.domain.entity import Shape
from app.powerpoint.domain.enum import ShapeType
from app.powerpoint.domain.valueobject import ColorConfig, Position, Size
from app.powerpoint.infrastructure.repository.shape.entity import ShapeAlchemyEntity


class ShapeMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: ShapeAlchemyEntity) -> Shape:
        return Shape(
            id=ULID.from_str(alchemy_entity.id),
            layout_id=ULID.from_str(alchemy_entity.layout_id),
            shape_id=alchemy_entity.shape_id,
            size=Size(**json.loads(alchemy_entity.size)),
            position=Position(**json.loads(alchemy_entity.position)),
            name=alchemy_entity.name,
            text=alchemy_entity.text,
            placeholder=alchemy_entity.placeholder,
            type=ShapeType(alchemy_entity.type),
            fill_color=ColorConfig(**json.loads(alchemy_entity.fill_color)),
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Shape) -> ShapeAlchemyEntity:
        return ShapeAlchemyEntity(
            id=str(domain_entity.id),
            layout_id=str(domain_entity.layout_id),
            shape_id=domain_entity.shape_id,
            size=domain_entity.size.model_dump_json(),
            position=domain_entity.position.model_dump_json(),
            name=domain_entity.name,
            text=domain_entity.text,
            placeholder=domain_entity.placeholder,
            type=domain_entity.type,
            fill_color=domain_entity.fill_color.model_dump_json(),
        )
