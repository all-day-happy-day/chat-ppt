import json

from ulid import ULID

from app.powerpoint.domain.entity import Template
from app.powerpoint.domain.valueobject import Size
from app.powerpoint.infrastructure.repository.layout.mapper import LayoutMapper
from app.powerpoint.infrastructure.repository.template.entity import TemplateAlchemyEntity


class TemplateMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: TemplateAlchemyEntity) -> Template:
        return Template(
            id=ULID.from_str(alchemy_entity.id),
            user_id=ULID.from_str(alchemy_entity.user_id),
            name=alchemy_entity.name,
            slide_size=Size(**json.loads(alchemy_entity.slide_size)),
            created_at=alchemy_entity.created_at,
            updated_at=alchemy_entity.updated_at,
            layouts=[LayoutMapper.to_domain_entity(alchemy_entity=layout) for layout in alchemy_entity.layouts],
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Template) -> TemplateAlchemyEntity:
        return TemplateAlchemyEntity(
            id=str(domain_entity.id),
            user_id=str(domain_entity.user_id),
            name=domain_entity.name,
            slide_size=json.dumps(domain_entity.slide_size.model_dump()),
            created_at=domain_entity.created_at,
            updated_at=domain_entity.updated_at,
            layouts=[LayoutMapper.to_alchemy_entity(domain_entity=layout) for layout in domain_entity.layouts],
        )
