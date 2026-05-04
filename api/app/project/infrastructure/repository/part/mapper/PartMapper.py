from collections.abc import Mapping
from typing import Any

from ulid import ULID

from app.project.domain.entity import BiblePart, LyricsPart, PlainPart, ValuePart
from app.project.domain.enum import PartType
from app.project.domain.types import Parts
from app.project.domain.valueobject import BibleContents, LyricsContents, PlainContents, ValueContents
from app.project.infrastructure.repository.part.entity import PartAlchemyEntity


class PartMapper:
    @staticmethod
    def _optional_ulid_from_additional_data(data: Mapping[str, Any], key: str) -> ULID | None:
        raw: Any | None = data.get(key)
        if not isinstance(raw, str) or len(raw) == 0:
            return None
        return ULID.from_str(raw)

    @staticmethod
    def to_domain_entity(alchemy_entity: PartAlchemyEntity) -> Parts:
        if alchemy_entity.type == PartType.BIBLE:
            additional: Mapping[str, Any] = alchemy_entity.additional_data
            return BiblePart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=BibleContents(**alchemy_entity.contents),
                phrase_layout_id=PartMapper._optional_ulid_from_additional_data(additional, "phrase_layout_id"),
                title_layout_id=PartMapper._optional_ulid_from_additional_data(additional, "title_layout_id"),
            )
        elif alchemy_entity.type == PartType.LYRICS:
            additional_lyrics: Mapping[str, Any] = alchemy_entity.additional_data
            return LyricsPart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=LyricsContents(**alchemy_entity.contents),
                lyrics_layout_id=PartMapper._optional_ulid_from_additional_data(additional_lyrics, "lyrics_layout_id"),
                title_layout_id=PartMapper._optional_ulid_from_additional_data(additional_lyrics, "title_layout_id"),
            )
        elif alchemy_entity.type == PartType.PLAIN:
            layout_raw: str | None = alchemy_entity.additional_data.get("layout_id")
            return PlainPart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=PlainContents(**alchemy_entity.contents),
                layout_id=ULID.from_str(layout_raw) if layout_raw is not None else None,
            )
        elif alchemy_entity.type == PartType.VALUE:
            layout_raw_value: str | None = alchemy_entity.additional_data.get("layout_id")
            return ValuePart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=ValueContents(**alchemy_entity.contents),
                layout_id=ULID.from_str(layout_raw_value) if layout_raw_value is not None else None,
            )
        else:
            raise ValueError(f"Invalid part type: {alchemy_entity.type}")

    @staticmethod
    def to_alchemy_entity(domain_entity: Parts) -> PartAlchemyEntity:
        return PartAlchemyEntity(
            id=str(domain_entity.id),
            project_id=str(domain_entity.project_id),
            container_id=str(domain_entity.container_id) if domain_entity.container_id is not None else None,
            order=domain_entity.order,
            type=domain_entity.type,
            contents=domain_entity.contents.model_dump(mode="json"),
            additional_data=domain_entity.model_dump(
                mode="json", exclude={"id", "project_id", "container_id", "order", "type", "contents"}
            ),
        )
