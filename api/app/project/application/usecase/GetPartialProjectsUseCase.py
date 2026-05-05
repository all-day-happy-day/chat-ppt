from ulid import ULID

from app.project.domain.entity import Project
from app.project.domain.repository import ProjectRepository


class GetPartialProjectsUseCase:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository: ProjectRepository = project_repository

    def __call__(self, user_id: ULID, size: int) -> list[Project]:
        return self.project_repository.get_partial_ordered_by_created_at(user_id=user_id, size=size)
