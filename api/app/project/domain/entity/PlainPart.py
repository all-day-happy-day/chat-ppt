from typing import Literal

from pydantic import Field
from ulid import ULID

from app.project.domain.enum import PartType
from app.project.domain.valueobject import PlainContents

from .BasePart import BasePart


class PlainPart(BasePart):
    type: Literal[PartType.PLAIN] = Field(default=PartType.PLAIN)
    contents: PlainContents
    layout_id: ULID
