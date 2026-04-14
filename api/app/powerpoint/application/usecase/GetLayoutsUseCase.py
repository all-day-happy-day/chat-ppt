from ulid import ULID

from app.powerpoint.domain.entity import Template
from app.powerpoint.domain.repository import TemplateRepository


class GetLayoutsUseCase:
    def __init__(self, template_repository: TemplateRepository) -> None:
        self.template_repository: TemplateRepository = template_repository

    def __call__(self, template_id: ULID) -> Template:
        return self.template_repository.get_by_id(id=template_id)
