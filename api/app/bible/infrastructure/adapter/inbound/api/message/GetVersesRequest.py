from pydantic import BaseModel

from app.shared.bible.domain.enum import AvailableBibleVersions


class GetVersesRequest(BaseModel):
    version: AvailableBibleVersions
    book: str
    chapter: int
