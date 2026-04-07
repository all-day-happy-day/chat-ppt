from ulid import ULID

from app.project.domain.entity import Project
from app.project.infrastructure.repository.part.mapper import PartMapper
from app.project.infrastructure.repository.project.entity import ProjectAlchemyEntity


class ProjectMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: ProjectAlchemyEntity) -> Project:
        return Project(
            id=ULID.from_str(alchemy_entity.id),
            name=alchemy_entity.name,
            template_id=ULID.from_str(alchemy_entity.template_id),
            user_id=ULID.from_str(alchemy_entity.user_id),
            parts=[PartMapper.to_domain_entity(part) for part in alchemy_entity.parts],
            created_at=alchemy_entity.created_at,
            updated_at=alchemy_entity.updated_at,
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Project) -> ProjectAlchemyEntity:
        return ProjectAlchemyEntity(
            id=str(domain_entity.id),
            name=domain_entity.name,
            template_id=str(domain_entity.template_id),
            user_id=str(domain_entity.user_id),
            created_at=domain_entity.created_at,
            updated_at=domain_entity.updated_at,
            parts=[PartMapper.to_alchemy_entity(part) for part in domain_entity.parts],
        )
