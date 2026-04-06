from sqlalchemy.orm import Session
from ulid import ULID

from app.powerpoint.domain.entity import TemplateFile
from app.powerpoint.domain.exception import TemplateFileNotFound
from app.powerpoint.domain.repository import TemplateFileRepository
from app.powerpoint.infrastructure.repository.template_file.entity import TemplateFileAlchemyEntity
from app.powerpoint.infrastructure.repository.template_file.mapper import TemplateFileMapper


class AlchemyTemplateFileRepository(TemplateFileRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, template_file: TemplateFile) -> TemplateFile:
        alchemy_entity: TemplateFileAlchemyEntity = TemplateFileMapper.to_alchemy_entity(template_file)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return TemplateFileMapper.to_domain_entity(alchemy_entity)

    def get_by_template_id(self, template_id: ULID) -> TemplateFile:
        alchemy_entity: TemplateFileAlchemyEntity | None = (
            self.db
            .query(TemplateFileAlchemyEntity)
            .filter(TemplateFileAlchemyEntity.template_id == str(template_id))
            .first()
        )
        if alchemy_entity is None:
            raise TemplateFileNotFound(f"Template file not found: {template_id}")
        return TemplateFileMapper.to_domain_entity(alchemy_entity)

    def delete_by_template_id(self, template_id: ULID) -> None:
        alchemy_entity: TemplateFileAlchemyEntity | None = (
            self.db
            .query(TemplateFileAlchemyEntity)
            .filter(TemplateFileAlchemyEntity.template_id == str(template_id))
            .first()
        )
        if alchemy_entity is None:
            raise TemplateFileNotFound(f"Template file not found: {template_id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_all_by_user_id(self, user_id: ULID) -> list[TemplateFile]:
        alchemy_entities: list[TemplateFileAlchemyEntity] = (
            self.db.query(TemplateFileAlchemyEntity).filter(TemplateFileAlchemyEntity.user_id == str(user_id)).all()
        )
        return [TemplateFileMapper.to_domain_entity(entity) for entity in alchemy_entities]
