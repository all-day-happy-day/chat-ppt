from ulid import ULID

from app.project.domain.entity import ProjectContainer
from app.project.infrastructure.repository.part.mapper import PartMapper
from app.project.infrastructure.repository.project_container.entity import ProjectContainerAlchemyEntity


class ProjectContainerMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: ProjectContainerAlchemyEntity) -> ProjectContainer:
        return ProjectContainer(
            id=ULID.from_str(alchemy_entity.id),
            project_id=ULID.from_str(alchemy_entity.project_id),
            container_name=alchemy_entity.container_name,
            parts=[PartMapper.to_domain_entity(part) for part in alchemy_entity.parts],
            created_at=alchemy_entity.created_at,
            updated_at=alchemy_entity.updated_at,
            completed=alchemy_entity.completed,
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: ProjectContainer) -> ProjectContainerAlchemyEntity:
        return ProjectContainerAlchemyEntity(
            id=str(domain_entity.id),
            project_id=str(domain_entity.project_id),
            container_name=domain_entity.container_name,
            parts=[PartMapper.to_alchemy_entity(part) for part in domain_entity.parts],
            created_at=domain_entity.created_at,
            updated_at=domain_entity.updated_at,
            completed=domain_entity.completed,
        )
