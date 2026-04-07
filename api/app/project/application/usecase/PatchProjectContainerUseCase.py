from datetime import datetime, timezone

from ulid import ULID

from app.project.domain.entity import ProjectContainer
from app.project.domain.repository import ProjectContainerRepository
from app.project.domain.types import Parts


class PatchProjectContainerUseCase:
    def __init__(self, project_container_repository: ProjectContainerRepository) -> None:
        self.project_container_repository: ProjectContainerRepository = project_container_repository

    def __call__(
        self,
        project_container_id: ULID,
        container_name: str | None = None,
        completed: bool | None = None,
        parts: list[Parts] | None = None,
    ) -> ProjectContainer:
        project_container: ProjectContainer = self.project_container_repository.get_by_id(id=project_container_id)
        has_changed: bool = False
        if container_name is not None:
            has_changed = True
            project_container.container_name = container_name
        if completed is not None:
            has_changed = True
            project_container.completed = completed
        if parts is not None:
            has_changed = True
            project_container.parts = parts
        if has_changed:
            project_container.updated_at = datetime.now(timezone.utc)
        return self.project_container_repository.save(project_container=project_container)
