from typing import Self

from pydantic import BaseModel

from app.bible.domain.valueobject import BiblePhrase


class GetBiblePhraseResponse(BaseModel):
    version: str
    book: str
    chapter: int
    verse: int
    phrase: str

    @classmethod
    def from_model(cls, bible_prhase: BiblePhrase) -> Self:
        return cls(
            version=bible_prhase.version.value,
            book=bible_prhase.book,
            chapter=bible_prhase.chapter,
            verse=bible_prhase.verse,
            phrase=bible_prhase.phrase,
        )
