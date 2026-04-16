from pydantic import BaseModel

from app.shared.bible.domain.enum import AvailableBibleVersions


class GetChaptersRequest(BaseModel):
    version: AvailableBibleVersions
    book: str
