from typing import Annotated, Literal, TypeAlias, Union

from pydantic import BaseModel, Field
from ulid import ULID

from app.project.domain.entity import BiblePart, LyricsPart, PlainPart, ValuePart
from app.project.domain.enum import PartType
from app.project.domain.types import Parts
from app.project.domain.valueobject import BibleContents, LyricsContents, PlainContents, ValueContents


class BasePartCommand(BaseModel):
    id: ULID
    order: int = Field(ge=0)


class BiblePartCommand(BasePartCommand):
    type: Literal[PartType.BIBLE] = Field(default=PartType.BIBLE)
    contents: BibleContents
    phrase_layout_id: ULID | None = None
    title_layout_id: ULID | None = None


class LyricsPartCommand(BasePartCommand):
    type: Literal[PartType.LYRICS] = Field(default=PartType.LYRICS)
    contents: LyricsContents
    lyrics_layout_id: ULID | None = None
    title_layout_id: ULID | None = None


class PlainPartCommand(BasePartCommand):
    type: Literal[PartType.PLAIN] = Field(default=PartType.PLAIN)
    contents: PlainContents
    layout_id: ULID | None = None


class ValuePartCommand(BasePartCommand):
    type: Literal[PartType.VALUE] = Field(default=PartType.VALUE)
    contents: ValueContents
    layout_id: ULID | None = None


PartCommand: TypeAlias = Annotated[
    Union[BiblePartCommand, LyricsPartCommand, PlainPartCommand, ValuePartCommand],
    Field(discriminator="type"),
]


def to_domain_part(command_part: PartCommand, project_id: ULID, container_id: ULID | None = None) -> Parts:
    if isinstance(command_part, BiblePartCommand):
        return BiblePart(
            id=command_part.id,
            project_id=project_id,
            container_id=container_id,
            order=command_part.order,
            contents=command_part.contents,
            phrase_layout_id=command_part.phrase_layout_id,
            title_layout_id=command_part.title_layout_id,
        )
    if isinstance(command_part, LyricsPartCommand):
        return LyricsPart(
            id=command_part.id,
            project_id=project_id,
            container_id=container_id,
            order=command_part.order,
            contents=command_part.contents,
            lyrics_layout_id=command_part.lyrics_layout_id,
            title_layout_id=command_part.title_layout_id,
        )
    if isinstance(command_part, PlainPartCommand):
        return PlainPart(
            id=command_part.id,
            project_id=project_id,
            container_id=container_id,
            order=command_part.order,
            contents=command_part.contents,
            layout_id=command_part.layout_id,
        )
    if isinstance(command_part, ValuePartCommand):
        return ValuePart(
            id=command_part.id,
            project_id=project_id,
            container_id=container_id,
            order=command_part.order,
            contents=command_part.contents,
            layout_id=command_part.layout_id,
        )
    raise ValueError(f"Invalid part type: {type(command_part)}")
