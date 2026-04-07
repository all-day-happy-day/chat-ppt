from pydantic import BaseModel

from core.shared.bible.domain.enum import AvailableBibleVersions


class GetBiblePhraseRequest(BaseModel):
    version: AvailableBibleVersions
    book: str
    chapter: int
    verse: int
