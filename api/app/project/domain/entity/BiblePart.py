from typing import Literal

from pydantic import Field
from ulid import ULID

from app.project.domain.enum import PartType
from app.project.domain.valueobject import BibleContents

from .BasePart import BasePart


class BiblePart(BasePart):
    type: Literal[PartType.BIBLE] = Field(default=PartType.BIBLE)
    contents: BibleContents
    phrase_layout_id: ULID | None = None
    title_layout_id: ULID | None = None
