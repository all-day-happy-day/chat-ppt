from pydantic import BaseModel

from app.shared.bible.domain.enum import AvailableBibleVersions


class GetBooksRequest(BaseModel):
    version: AvailableBibleVersions
