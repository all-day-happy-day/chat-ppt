from typing import Literal

from pydantic import BaseModel, Field

from app.project.domain.enum import PartType


class ValueContent(BaseModel):
    placeholder_name: str
    placeholder_shape_id: int
    value: str | None = None


class ValueContents(BaseModel):
    type: Literal[PartType.VALUE] = Field(default=PartType.VALUE)
    contents: list[ValueContent]
