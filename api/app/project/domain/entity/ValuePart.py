from typing import Literal

from pydantic import Field
from ulid import ULID

from app.project.domain.enum import PartType
from app.project.domain.valueobject import ValueContents

from .BasePart import BasePart


class ValuePart(BasePart):
    type: Literal[PartType.VALUE] = Field(default=PartType.VALUE)
    contents: ValueContents
    layout_id: ULID
