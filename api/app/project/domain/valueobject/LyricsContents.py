from typing import Literal

from pydantic import BaseModel, Field
from ulid import ULID

from app.project.domain.enum import PartType
from app.shared.song.domain.valueobject import LyricsPart


class LyricsContent(BaseModel):
    title: str
    lyrics: list[LyricsPart]
    artist: str | None = None
    song_id: ULID | None = Field(default=None)
    lyrics_part_sequence: list[int] = Field(default_factory=list)
    lyrics_parts_configured: bool = False
    include_title_slide: bool = Field(default=True)


class LyricsContents(BaseModel):
    type: Literal[PartType.LYRICS] = Field(default=PartType.LYRICS)
    contents: list[LyricsContent]
    lyrics_placeholder_shape_id: int
    title_placeholder_values: dict[int, str] | None = None
