from pydantic import BaseModel, model_validator
from ulid import ULID

from app.shared.song.domain.exception import DuplicatedPartName

from .LyricsPart import LyricsPart


class Lyrics(BaseModel):
    song_id: ULID
    lyrics: list[LyricsPart]

    @model_validator(mode="after")
    def validate_lyrics(self) -> "Lyrics":
        part_names_set: set[str] = set(lyric.part for lyric in self.lyrics)
        part_names_list: list[str] = list(lyric.part for lyric in self.lyrics)
        if len(part_names_set) != len(part_names_list):
            raise DuplicatedPartName("Part name must be unique")
        return self
