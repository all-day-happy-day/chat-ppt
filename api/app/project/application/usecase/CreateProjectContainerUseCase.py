from datetime import datetime, timezone

from ulid import ULID

from app.project.domain.entity import Project, ProjectContainer
from app.project.domain.repository import ProjectContainerRepository, ProjectRepository


class CreateProjectContainerUseCase:
    def __init__(
        self, project_repository: ProjectRepository, project_container_repository: ProjectContainerRepository
    ) -> None:
        self.project_repository: ProjectRepository = project_repository
        self.project_container_repository: ProjectContainerRepository = project_container_repository

    def __call__(self, project_id: ULID, user_id: ULID, container_name: str) -> ProjectContainer:
        project: Project = self.project_repository.get_by_id(id=project_id)
        now: datetime = datetime.now(timezone.utc)
        project_container: ProjectContainer = ProjectContainer(
            project_id=project_id,
            container_name=container_name,
            created_at=now,
            updated_at=now,
            completed=False,
            parts=project.parts,
        )
        return self.project_container_repository.save(project_container=project_container)
