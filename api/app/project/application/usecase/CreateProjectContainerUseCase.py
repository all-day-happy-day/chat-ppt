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
        container_id: ULID = ULID()
        project_container: ProjectContainer = ProjectContainer(
            id=container_id,
            project_id=project_id,
            container_name=container_name,
            created_at=now,
            updated_at=now,
            completed=False,
            parts=[part.model_copy(update={"id": ULID(), "container_id": container_id}) for part in project.parts],
        )
        return self.project_container_repository.save(project_container=project_container)
