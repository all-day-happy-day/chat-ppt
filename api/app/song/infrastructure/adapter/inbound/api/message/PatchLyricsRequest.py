from pydantic import BaseModel

from core.shared.song.domain.valueobject import LyricsPart


class PatchLyricsRequest(BaseModel):
    lyrics: list[LyricsPart]
