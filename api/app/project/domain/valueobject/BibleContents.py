from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.project.domain.enum import PartType
from app.shared.bible.domain.enum import AvailableBibleVersions


class BibleContent(BaseModel):
    version: AvailableBibleVersions
    book: str
    chapter: int
    verse: int


class BibleContentRange(BaseModel):
    type: Literal["phrase", "title"]
    start: BibleContent | None = None
    end: BibleContent | None = None

    @model_validator(mode="after")
    def validate_start(self) -> Self:
        if self.type == "phrase" and self.start is None:
            raise ValueError("Start is required")
        elif self.type == "title" and self.start is not None:
            raise ValueError("Start is not allowed for title")
        return self


class BibleContents(BaseModel):
    type: Literal[PartType.BIBLE] = Field(default=PartType.BIBLE)
    contents: list[BibleContentRange]
    phrase_placeholder_id: int
    phrase_range_placeholder_id: int | None
    title_placeholder_values: dict[int, str] | None = None
