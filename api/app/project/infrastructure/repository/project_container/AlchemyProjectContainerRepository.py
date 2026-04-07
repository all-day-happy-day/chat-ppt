from sqlalchemy.orm import Session
from ulid import ULID

from app.project.domain.entity import ProjectContainer
from app.project.domain.exception import ProjectContainerNotFound
from app.project.domain.repository import ProjectContainerRepository
from app.project.infrastructure.repository.project_container.entity import ProjectContainerAlchemyEntity
from app.project.infrastructure.repository.project_container.mapper import ProjectContainerMapper


class AlchemyProjectContainerRepository(ProjectContainerRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, project_container: ProjectContainer) -> ProjectContainer:
        alchemy_entity: ProjectContainerAlchemyEntity = ProjectContainerMapper.to_alchemy_entity(project_container)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return ProjectContainerMapper.to_domain_entity(alchemy_entity)

    def get_by_id(self, id: ULID) -> ProjectContainer:
        alchemy_entity: ProjectContainerAlchemyEntity | None = (
            self.db.query(ProjectContainerAlchemyEntity).filter(ProjectContainerAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectContainerNotFound(f"Project container not found: {id}")
        return ProjectContainerMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, id: ULID) -> None:
        alchemy_entity: ProjectContainerAlchemyEntity | None = (
            self.db.query(ProjectContainerAlchemyEntity).filter(ProjectContainerAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectContainerNotFound(f"Project container not found: {id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_all_by_project_id(self, project_id: ULID) -> list[ProjectContainer]:
        alchemy_entities: list[ProjectContainerAlchemyEntity] = (
            self.db
            .query(ProjectContainerAlchemyEntity)
            .filter(ProjectContainerAlchemyEntity.project_id == str(project_id))
            .all()
        )
        return [ProjectContainerMapper.to_domain_entity(entity) for entity in alchemy_entities]
