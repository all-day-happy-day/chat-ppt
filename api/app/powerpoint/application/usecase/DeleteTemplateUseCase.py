from ulid import ULID

from app.powerpoint.domain.port.outbound import TemplateFileStoragePort
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository


class DeleteTemplateUseCase:
    def __init__(
        self,
        template_file_storage_port: TemplateFileStoragePort,
        template_file_repository: TemplateFileRepository,
        template_repository: TemplateRepository,
    ) -> None:
        self.template_file_storage_port: TemplateFileStoragePort = template_file_storage_port
        self.template_file_repository: TemplateFileRepository = template_file_repository
        self.template_repository: TemplateRepository = template_repository

    def __call__(self, template_id: ULID) -> None:
        self.template_file_storage_port.delete(
            template_file=self.template_file_repository.get_by_template_id(template_id=template_id)
        )
        self.template_repository.delete_by_id(id=template_id)
