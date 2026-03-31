from pydantic import BaseModel

from app.song.domain.valueobject import Lyrics


class PatchLyricsResponse(BaseModel):
    lyrics: Lyrics
