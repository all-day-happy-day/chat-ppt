from datetime import datetime
from typing import Self

from pydantic import BaseModel
from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile


class BaseTemplateResponse(BaseModel):
    template_id: ULID
    user_id: ULID
    name: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain_entity(cls, template_file: TemplateFile, template: Template) -> Self:
        return cls(
            template_id=template_file.template_id,
            user_id=template_file.user_id,
            name=template.name,
            created_at=template.created_at,
            updated_at=template.updated_at,
        )
