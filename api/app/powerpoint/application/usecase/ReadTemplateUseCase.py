import random
import string
from pathlib import Path

from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile
from app.powerpoint.domain.port.outbound import TemplateFileStoragePort
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository
from app.powerpoint.domain.service import TemplateReadService


class ReadTemplateUseCase:
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
        template_name: str | None = None,
    ) -> tuple[TemplateFile, Template]:
        if template_name is None:
            template_name_list: list[str] = [
                template.name for template in self.template_repository.get_all_by_user_id(user_id=user_id)
            ]
            while (
                template_name := "".join(random.choices(string.ascii_letters + string.digits, k=10)) + ".pptx"
            ) in template_name_list:
                pass

        ppt_path: Path = self.template_file_storage_port.save(data=filedata, filename=filename)
        template_file, template = self.template_read_service.read(
            user_id=user_id, ppt_path=ppt_path, template_name=template_name, template=None
        )
        self.template_file_repository.save(template_file=template_file)
        self.template_repository.save(template=template)
        return template_file, template
