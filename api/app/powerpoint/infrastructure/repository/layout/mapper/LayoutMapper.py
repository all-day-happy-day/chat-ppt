import json

from ulid import ULID

from app.powerpoint.domain.entity import Layout
from app.powerpoint.domain.valueobject import ColorConfig
from app.powerpoint.infrastructure.repository.layout.entity import LayoutAlchemyEntity
from app.powerpoint.infrastructure.repository.shape.mapper import ShapeMapper


class LayoutMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: LayoutAlchemyEntity) -> Layout:
        return Layout(
            id=ULID.from_str(alchemy_entity.id),
            template_id=ULID.from_str(alchemy_entity.template_id),
            name=alchemy_entity.name,
            background_color=ColorConfig(**json.loads(alchemy_entity.background_color)),
            shapes=[ShapeMapper.to_domain_entity(alchemy_entity=shape) for shape in alchemy_entity.shapes],
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Layout) -> LayoutAlchemyEntity:
        return LayoutAlchemyEntity(
            id=str(domain_entity.id),
            template_id=str(domain_entity.template_id),
            name=domain_entity.name,
            background_color=domain_entity.background_color.model_dump(),
            shapes=[ShapeMapper.to_alchemy_entity(domain_entity=shape) for shape in domain_entity.shapes],
        )
