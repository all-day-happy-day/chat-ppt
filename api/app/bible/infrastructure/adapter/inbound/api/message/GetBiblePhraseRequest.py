from pydantic import BaseModel

from app.bible.domain.valueobject import AvailableBibleVersions


class GetBiblePhraseRequest(BaseModel):
    version: AvailableBibleVersions
    book: str
    chapter: int
    verse: int
