from datetime import datetime

from pydantic import BaseModel, Field
from ulid import ULID

from app.powerpoint.domain.valueobject import Size

from .Layout import Layout


class Template(BaseModel):
    id: ULID = Field(default_factory=lambda: ULID())
    user_id: ULID
    name: str
    slide_size: Size
    created_at: datetime
    updated_at: datetime
    layouts: list[Layout]
