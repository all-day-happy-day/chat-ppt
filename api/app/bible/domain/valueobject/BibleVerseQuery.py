from typing import Self

from pydantic import BaseModel, model_validator

from app.bible.domain.exception import UnsupportedLetter, UnsupportedVersion
from app.bible.domain.service import ParseVerseQueryService
from app.shared.bible.domain.enum import AvailableBibleVersions


class BibleVerseQuery(BaseModel):
    version: AvailableBibleVersions
    book: str
    chapter: str
    verse: str

    @model_validator(mode="after")
    def validate_version(self) -> Self:
        if self.version.value not in AvailableBibleVersions:
            raise UnsupportedVersion(f"Unsupported version: {self.version}")
        return self

    @model_validator(mode="after")
    def validate_chapter(self) -> Self:
        if not self.chapter.isdigit():
            raise UnsupportedLetter("Chapter must be a number")
        return self

    @model_validator(mode="after")
    def validate_verse(self) -> Self:
        ParseVerseQueryService().parse_verse(verse=self.verse)
        return self
