from datetime import datetime, timezone

from ulid import ULID

from app.project.domain.entity import Project
from app.project.domain.repository import ProjectRepository
from app.project.domain.types import Parts


class PatchProjectUseCase:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository: ProjectRepository = project_repository

    def __call__(self, project_id: ULID, name: str | None = None, parts: list[Parts] | None = None) -> Project:
        project: Project = self.project_repository.get_by_id(id=project_id)
        has_changed: bool = False
        if name is not None:
            has_changed = True
            project.name = name
        if parts is not None:
            has_changed = True
            project.parts = parts
        if has_changed:
            project.updated_at = datetime.now(timezone.utc)
        return self.project_repository.save(project=project)
