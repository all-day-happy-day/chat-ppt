from pydantic import BaseModel, model_validator
from ulid import ULID

from app.shared.song.domain.exception import DuplicatedPartName

from .LyricsPart import LyricsPart


class Lyrics(BaseModel):
    song_id: ULID
    lyrics: list[LyricsPart]

    @model_validator(mode="after")
    def validate_lyrics(self) -> "Lyrics":
        if set(lyric.part for lyric in self.lyrics) != list(lyric.part for lyric in self.lyrics):
            raise DuplicatedPartName("Part name must be unique")
        return self
