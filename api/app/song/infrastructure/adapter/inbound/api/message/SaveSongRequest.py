from pydantic import BaseModel
from ulid import ULID

from app.shared.song.domain.valueobject import LyricsPart


class SaveSongRequest(BaseModel):
    user_id: ULID
    title: str
    artist: str | None = None
    lyrics: list[LyricsPart]
