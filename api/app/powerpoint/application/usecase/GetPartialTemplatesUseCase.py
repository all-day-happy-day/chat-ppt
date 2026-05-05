from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository


class GetPartialTemplatesUseCase:
    def __init__(
        self, template_repository: TemplateRepository, template_file_repository: TemplateFileRepository
    ) -> None:
        self.template_repository: TemplateRepository = template_repository
        self.template_file_repository: TemplateFileRepository = template_file_repository

    def __call__(self, user_id: ULID, size: int) -> tuple[list[Template], list[TemplateFile]]:
        return (
            self.template_repository.get_partial_ordered_by_created_at(user_id=user_id, size=size),
            self.template_file_repository.get_partial_ordered_by_created_at(user_id=user_id, size=size),
        )
