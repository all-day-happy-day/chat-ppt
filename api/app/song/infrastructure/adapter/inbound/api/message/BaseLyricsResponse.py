from pydantic import BaseModel

from app.shared.song.domain.valueobject import Lyrics
from app.song.domain.entity import Song


class BaseLyricsResponse(BaseModel):
    song: Song
    lyrics: Lyrics
