from datetime import datetime, timezone

from ulid import ULID

from app.project.domain.entity import Project
from app.project.domain.repository import ProjectRepository


class CreateProjectUseCase:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository: ProjectRepository = project_repository

    def __call__(self, template_id: ULID, user_id: ULID, name: str) -> Project:
        now: datetime = datetime.now(timezone.utc)
        project: Project = Project(
            template_id=template_id,
            user_id=user_id,
            name=name,
            created_at=now,
            updated_at=now,
            parts=[],
        )
        return self.project_repository.save(project=project)
