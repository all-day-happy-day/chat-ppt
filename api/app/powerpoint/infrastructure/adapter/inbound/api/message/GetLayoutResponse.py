from typing import Self

from pydantic import BaseModel

from app.powerpoint.domain.entity import Layout, Shape


class GetLayoutResponse(BaseModel):
    name: str
    shapes: list[Shape]

    @classmethod
    def from_domain_entity(cls, layout: Layout) -> Self:
        return cls(name=layout.name, shapes=layout.shapes)
