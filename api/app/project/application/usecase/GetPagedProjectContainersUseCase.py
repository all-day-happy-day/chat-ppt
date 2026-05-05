from ulid import ULID

from app.project.domain.entity import ProjectContainer
from app.project.domain.repository import ProjectContainerRepository
from app.shared.page import Page, PagingOptions


class GetPagedProjectContainersUseCase:
    def __init__(self, project_container_repository: ProjectContainerRepository) -> None:
        self.project_container_repository: ProjectContainerRepository = project_container_repository

    def __call__(self, project_id: ULID, paging_options: PagingOptions) -> Page[ProjectContainer]:
        return self.project_container_repository.get_all_paged_by_project_id(
            project_id=project_id, paging_options=paging_options
        )
