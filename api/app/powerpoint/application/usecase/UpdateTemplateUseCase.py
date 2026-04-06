from pathlib import Path

from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile
from app.powerpoint.domain.port.outbound import TemplateFileStoragePort
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository
from app.powerpoint.domain.service import TemplateReadService


class UpdateTemplateUseCase:
    def __init__(
        self,
        template_file_storage_port: TemplateFileStoragePort,
        template_read_service: TemplateReadService,
        template_file_repository: TemplateFileRepository,
        template_repository: TemplateRepository,
    ) -> None:
        self.template_file_storage_port: TemplateFileStoragePort = template_file_storage_port
        self.template_read_service: TemplateReadService = template_read_service
        self.template_file_repository: TemplateFileRepository = template_file_repository
        self.template_repository: TemplateRepository = template_repository

    def __call__(
        self,
        user_id: ULID,
        filedata: bytes,
        filename: str,
        template_id: ULID,
        template_name: str | None = None,
    ) -> tuple[TemplateFile, Template]:
        template: Template = self.template_repository.get_by_id(id=template_id)
        if template_name is None:
            template_name = template.name
        assert template_name is not None

        ppt_path: Path = self.template_file_storage_port.save(data=filedata, filename=filename)
        template_file, template = self.template_read_service.read(
            user_id=user_id, ppt_path=ppt_path, template_name=template_name, template=template
        )

        self.template_file_repository.save(template_file=template_file)
        self.template_repository.save(template=template)
        return template_file, template
