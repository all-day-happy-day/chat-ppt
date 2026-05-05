from datetime import datetime
from pathlib import Path
from typing import Self

from pydantic import BaseModel
from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile
from app.powerpoint.domain.valueobject import Size


class BaseTemplateResponse(BaseModel):
    template_id: ULID
    user_id: ULID
    name: str
    filename: str
    layout_size: Size
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain_entity(cls, template_file: TemplateFile, template: Template) -> Self:
        return cls(
            template_id=template_file.template_id,
            user_id=template_file.user_id,
            name=template.name,
            filename=Path(template_file.path).name,
            layout_size=template.slide_size,
            created_at=template.created_at,
            updated_at=template.updated_at,
        )
