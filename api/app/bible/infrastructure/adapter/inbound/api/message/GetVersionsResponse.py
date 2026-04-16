from pydantic import BaseModel

from app.shared.bible.domain.enum import AvailableBibleVersions


class GetVersionsResponse(BaseModel):
    versions: list[AvailableBibleVersions]
