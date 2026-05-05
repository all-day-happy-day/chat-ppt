from pydantic import BaseModel

from app.shared.song.domain.valueobject import LyricsPart


class ScrapeLyricsResponse(BaseModel):
    title: str
    artist: str
    lyrics: list[LyricsPart]
