from pydantic import BaseModel

from app.shared.song.domain.valueobject import LyricsPart


class PatchLyricsRequest(BaseModel):
    lyrics: list[LyricsPart]
