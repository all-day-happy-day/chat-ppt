from pydantic import BaseModel, Field
from ulid import ULID

from app.powerpoint.domain.valueobject import ColorConfig

from .Shape import Shape


class Layout(BaseModel):
    id: ULID = Field(default_factory=lambda: ULID())
    template_id: ULID
    name: str
    shapes: list[Shape]
    background_color: ColorConfig
