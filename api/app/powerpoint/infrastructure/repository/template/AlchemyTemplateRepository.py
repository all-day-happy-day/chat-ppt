from sqlalchemy.orm import Session
from ulid import ULID

from app.powerpoint.domain.entity import Template
from app.powerpoint.domain.exception import TemplateNotFound
from app.powerpoint.domain.repository import TemplateRepository
from app.powerpoint.infrastructure.repository.template.entity import TemplateAlchemyEntity
from app.powerpoint.infrastructure.repository.template.mapper import TemplateMapper


class AlchemyTemplateRepository(TemplateRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, template: Template) -> Template:
        alchemy_entity: TemplateAlchemyEntity = TemplateMapper.to_alchemy_entity(template)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return TemplateMapper.to_domain_entity(alchemy_entity)

    def get_by_id(self, id: ULID) -> Template:
        alchemy_entity: TemplateAlchemyEntity | None = (
            self.db.query(TemplateAlchemyEntity).filter(TemplateAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise TemplateNotFound(f"Template not found: {id}")
        return TemplateMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, id: ULID) -> None:
        alchemy_entity: TemplateAlchemyEntity | None = (
            self.db.query(TemplateAlchemyEntity).filter(TemplateAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise TemplateNotFound(f"Template not found: {id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_all_by_user_id(self, user_id: ULID) -> list[Template]:
        alchemy_entities: list[TemplateAlchemyEntity] = (
            self.db.query(TemplateAlchemyEntity).filter(TemplateAlchemyEntity.user_id == str(user_id)).all()
        )
        return [TemplateMapper.to_domain_entity(entity) for entity in alchemy_entities]
