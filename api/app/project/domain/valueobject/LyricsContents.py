from typing import Literal

from pydantic import BaseModel, Field

from app.project.domain.enum import PartType
from app.shared.song.domain.valueobject import LyricsPart


class LyricsContent(BaseModel):
    title: str
    lyrics: list[LyricsPart]
    artist: str | None = None
    lyrics_part_sequence: list[int] = Field(default_factory=list)
    lyrics_parts_configured: bool = False


class LyricsContents(BaseModel):
    type: Literal[PartType.LYRICS] = Field(default=PartType.LYRICS)
    contents: list[LyricsContent]
