from pydantic import BaseModel
from ulid import ULID

from .LyricsPart import LyricsPart


class Lyrics(BaseModel):
    song_id: ULID
    lyrics: list[LyricsPart]
