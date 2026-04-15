from typing import Literal

from pydantic import Field
from ulid import ULID

from app.project.domain.enum import PartType
from app.project.domain.valueobject import LyricsContents

from .BasePart import BasePart


class LyricsPart(BasePart):
    type: Literal[PartType.LYRICS] = Field(default=PartType.LYRICS)
    contents: LyricsContents
    lyrics_layout_id: ULID | None = None
    title_layout_id: ULID | None = None
