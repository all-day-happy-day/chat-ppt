from ulid import ULID

from app.powerpoint.domain.entity import TemplateFile
from app.powerpoint.infrastructure.repository.template_file.entity import TemplateFileAlchemyEntity


class TemplateFileMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: TemplateFileAlchemyEntity) -> TemplateFile:
        return TemplateFile(
            template_id=ULID.from_str(alchemy_entity.template_id),
            user_id=ULID.from_str(alchemy_entity.user_id),
            path=alchemy_entity.path,
            size=alchemy_entity.size,
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: TemplateFile) -> TemplateFileAlchemyEntity:
        return TemplateFileAlchemyEntity(
            template_id=str(domain_entity.template_id),
            user_id=str(domain_entity.user_id),
            path=domain_entity.path,
            size=domain_entity.size,
        )
