from pydantic import BaseModel

from app.song.domain.valueobject import LyricsPart


class PatchLyricsRequest(BaseModel):
    lyrics: list[LyricsPart]
