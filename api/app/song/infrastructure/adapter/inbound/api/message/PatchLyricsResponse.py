from pydantic import BaseModel

from core.shared.song.domain.valueobject import Lyrics


class PatchLyricsResponse(BaseModel):
    lyrics: Lyrics
