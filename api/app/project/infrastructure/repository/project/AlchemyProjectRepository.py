from sqlalchemy.orm import Session
from ulid import ULID

from app.project.domain.entity import Project
from app.project.domain.exception import ProjectNotFound
from app.project.domain.repository import ProjectRepository
from app.project.infrastructure.repository.project.entity import ProjectAlchemyEntity
from app.project.infrastructure.repository.project.mapper import ProjectMapper


class AlchemyProjectRepository(ProjectRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, project: Project) -> Project:
        alchemy_entity: ProjectAlchemyEntity = ProjectMapper.to_alchemy_entity(project)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return project

    def get_by_id(self, id: ULID) -> Project:
        alchemy_entity: ProjectAlchemyEntity | None = (
            self.db.query(ProjectAlchemyEntity).filter(ProjectAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectNotFound(f"Project not found: {id}")
        return ProjectMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, id: ULID) -> None:
        alchemy_entity: ProjectAlchemyEntity | None = (
            self.db.query(ProjectAlchemyEntity).filter(ProjectAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectNotFound(f"Project not found: {id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_all_by_user_id(self, user_id: ULID) -> list[Project]:
        alchemy_entities: list[ProjectAlchemyEntity] = (
            self.db.query(ProjectAlchemyEntity).filter(ProjectAlchemyEntity.user_id == str(user_id)).all()
        )
        return [ProjectMapper.to_domain_entity(entity) for entity in alchemy_entities]
