from pydantic import BaseModel, Field
from ulid import ULID

from app.powerpoint.domain.enum import ShapeType
from app.powerpoint.domain.valueobject import ColorConfig, ImageData, Position, Size


class Shape(BaseModel):
    id: ULID = Field(default_factory=lambda: ULID())
    layout_id: ULID
    shape_id: int
    size: Size
    position: Position
    name: str
    text: str | None
    placeholder: bool
    type: ShapeType
    fill_color: ColorConfig
    image: ImageData | None = None
