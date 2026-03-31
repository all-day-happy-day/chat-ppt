from pydantic import BaseModel

from app.song.domain.entity import Song
from app.song.domain.valueobject import Lyrics


class BaseLyricsResponse(BaseModel):
    song: Song
    lyrics: Lyrics
