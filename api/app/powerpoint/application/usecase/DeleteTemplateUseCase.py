from ulid import ULID

from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository
from app.powerpoint.domain.service import TemplateFileStorageService


class DeleteTemplateUseCase:
    def __init__(
        self,
        template_file_storage_service: TemplateFileStorageService,
        template_file_repository: TemplateFileRepository,
        template_repository: TemplateRepository,
    ) -> None:
        self.template_file_storage_service: TemplateFileStorageService = template_file_storage_service
        self.template_file_repository: TemplateFileRepository = template_file_repository
        self.template_repository: TemplateRepository = template_repository

    def __call__(self, template_id: ULID) -> None:
        self.template_file_storage_service.delete(
            template_file=self.template_file_repository.get_by_template_id(template_id=template_id)
        )
        self.template_repository.delete_by_id(id=template_id)
