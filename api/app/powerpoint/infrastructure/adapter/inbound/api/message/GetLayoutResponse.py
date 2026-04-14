from typing import Self

from pydantic import BaseModel

from app.powerpoint.domain.entity import Layout, Shape
from app.powerpoint.domain.valueobject import Size


class GetLayoutResponse(BaseModel):
    name: str
    shapes: list[Shape]
    slide_size: Size

    @classmethod
    def from_domain_entity(cls, layout: Layout, slide_size: Size) -> Self:
        return cls(name=layout.name, shapes=layout.shapes, slide_size=slide_size)
