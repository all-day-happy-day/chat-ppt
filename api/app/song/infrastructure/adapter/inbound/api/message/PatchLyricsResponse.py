from pydantic import BaseModel

from app.shared.song.domain.valueobject import Lyrics


class PatchLyricsResponse(BaseModel):
    lyrics: Lyrics
