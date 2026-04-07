from ulid import ULID

from app.project.domain.repository import ProjectRepository


class DeleteProjectUseCase:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository: ProjectRepository = project_repository

    def __call__(self, project_id: ULID) -> None:
        self.project_repository.delete_by_id(id=project_id)
