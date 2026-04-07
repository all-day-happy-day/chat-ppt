from ulid import ULID

from app.project.domain.repository import ProjectContainerRepository


class DeleteProjectContainerUseCase:
    def __init__(self, project_container_repository: ProjectContainerRepository) -> None:
        self.project_container_repository: ProjectContainerRepository = project_container_repository

    def __call__(self, project_container_id: ULID) -> None:
        self.project_container_repository.delete_by_id(id=project_container_id)
