from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository
from app.shared.page import Page, PagingOptions


class GetPagedTemplatesByUserIDUseCase:
    def __init__(
        self, template_file_repository: TemplateFileRepository, template_repository: TemplateRepository
    ) -> None:
        self.template_file_repository: TemplateFileRepository = template_file_repository
        self.template_repository: TemplateRepository = template_repository

    def __call__(self, user_id: ULID, paging_options: PagingOptions) -> tuple[Page[TemplateFile], Page[Template]]:
        return (
            self.template_file_repository.get_all_paged_by_user_id(user_id=user_id, paging_options=paging_options),
            self.template_repository.get_all_paged_by_user_id(user_id=user_id, paging_options=paging_options),
        )
