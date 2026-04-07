from typing import Literal

from pydantic import BaseModel, Field

from app.project.domain.enum import PartType
from core.shared.song.domain.valueobject import LyricsPart


class LyricsContent(BaseModel):
    title: str
    lyrics: list[LyricsPart]


class LyricsContents(BaseModel):
    type: Literal[PartType.LYRICS] = Field(default=PartType.LYRICS)
    contents: list[LyricsContent]
