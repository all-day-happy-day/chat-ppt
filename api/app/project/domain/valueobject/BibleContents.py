from typing import Literal

from pydantic import BaseModel, Field

from app.project.domain.enum import PartType
from app.shared.bible.domain.enum import AvailableBibleVersions


class BibleContent(BaseModel):
    version: AvailableBibleVersions
    book: str
    chapter: int
    verse: int


class BibleContentRange(BaseModel):
    type: Literal["phrase", "title"]
    start: BibleContent
    end: BibleContent | None = None


class BibleContents(BaseModel):
    type: Literal[PartType.BIBLE] = Field(default=PartType.BIBLE)
    contents: list[BibleContentRange]
