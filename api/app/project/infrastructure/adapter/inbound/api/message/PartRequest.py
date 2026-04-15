from typing import Annotated, Literal, TypeAlias, Union

from pydantic import BaseModel, Field
from ulid import ULID

from app.project.domain.enum import PartType
from app.project.domain.valueobject import BibleContents, LyricsContents, PlainContents, ValueContents


class BasePartRequest(BaseModel):
    id: ULID
    order: int = Field(ge=0)


class BiblePartRequest(BasePartRequest):
    type: Literal[PartType.BIBLE] = Field(default=PartType.BIBLE)
    contents: BibleContents
    phrase_layout_id: ULID
    title_layout_id: ULID | None = None


class LyricsPartRequest(BasePartRequest):
    type: Literal[PartType.LYRICS] = Field(default=PartType.LYRICS)
    contents: LyricsContents
    lyrics_layout_id: ULID
    title_layout_id: ULID | None = None


class PlainPartRequest(BasePartRequest):
    type: Literal[PartType.PLAIN] = Field(default=PartType.PLAIN)
    contents: PlainContents
    layout_id: ULID | None = None


class ValuePartRequest(BasePartRequest):
    type: Literal[PartType.VALUE] = Field(default=PartType.VALUE)
    contents: ValueContents
    layout_id: ULID | None = None


PartRequest: TypeAlias = Annotated[
    Union[BiblePartRequest, LyricsPartRequest, PlainPartRequest, ValuePartRequest],
    Field(discriminator="type"),
]
