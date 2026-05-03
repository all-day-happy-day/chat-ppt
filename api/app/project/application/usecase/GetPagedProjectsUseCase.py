from ulid import ULID

from app.project.domain.entity import Project
from app.project.domain.repository import ProjectRepository
from app.shared.page import Page, PagingOptions


class GetPagedProjectsUseCase:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository: ProjectRepository = project_repository

    def __call__(self, user_id: ULID, paging_options: PagingOptions) -> Page[Project]:
        return self.project_repository.get_all_paged_by_user_id(user_id=user_id, paging_options=paging_options)
