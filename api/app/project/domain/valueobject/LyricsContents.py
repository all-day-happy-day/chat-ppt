from typing import Literal

from pydantic import BaseModel, Field

from app.project.domain.enum import PartType
from app.shared.song.domain.valueobject import LyricsPart


class LyricsContent(BaseModel):
    title: str
    lyrics: list[LyricsPart]
    artist: str | None = None
    """ULID of the user library song whose lyrics to sync when opening the song-form editor."""
    matched_backend_song_id: str | None = Field(default=None)
    lyrics_part_sequence: list[int] = Field(default_factory=list)
    lyrics_parts_configured: bool = False
    include_title_slide: bool = Field(default=True)


class LyricsContents(BaseModel):
    type: Literal[PartType.LYRICS] = Field(default=PartType.LYRICS)
    contents: list[LyricsContent]
    lyrics_placeholder_shape_ids: list[str] | None = Field(default=None)
    include_title_for_first_card: bool = Field(default=True)
