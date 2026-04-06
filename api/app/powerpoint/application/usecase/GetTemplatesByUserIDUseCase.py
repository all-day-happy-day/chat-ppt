from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository


class GetTemplatesByUserIDUseCase:
    def __init__(
        self, template_file_repository: TemplateFileRepository, template_repository: TemplateRepository
    ) -> None:
        self.template_file_repository: TemplateFileRepository = template_file_repository
        self.template_repository: TemplateRepository = template_repository

    def __call__(self, user_id: ULID) -> tuple[list[TemplateFile], list[Template]]:
        return (
            self.template_file_repository.get_all_by_user_id(user_id=user_id),
            self.template_repository.get_all_by_user_id(user_id=user_id),
        )
