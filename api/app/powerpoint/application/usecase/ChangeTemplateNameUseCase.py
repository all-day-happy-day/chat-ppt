from datetime import datetime, timezone

from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile
from app.powerpoint.domain.repository import TemplateFileRepository, TemplateRepository


class ChangeTemplateNameUseCase:
    def __init__(
        self, template_file_repository: TemplateFileRepository, template_repository: TemplateRepository
    ) -> None:
        self.template_file_repository: TemplateFileRepository = template_file_repository
        self.template_repository: TemplateRepository = template_repository

    def __call__(self, template_id: ULID, new_name: str) -> tuple[TemplateFile, Template]:
        template: Template = self.template_repository.get_by_id(id=template_id)
        template.name = new_name
        template.updated_at = datetime.now(tz=timezone.utc)
        self.template_repository.save(template=template)
        template_file: TemplateFile = self.template_file_repository.get_by_template_id(template_id=template_id)
        return template_file, template
