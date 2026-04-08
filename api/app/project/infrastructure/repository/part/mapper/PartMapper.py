from ulid import ULID

from app.project.domain.entity import BiblePart, LyricsPart, PlainPart, ValuePart
from app.project.domain.enum import PartType
from app.project.domain.types import Parts
from app.project.domain.valueobject import BibleContents, LyricsContents, PlainContents, ValueContents
from app.project.infrastructure.repository.part.entity import PartAlchemyEntity


class PartMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: PartAlchemyEntity) -> Parts:
        if alchemy_entity.type == PartType.BIBLE:
            return BiblePart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=BibleContents(**alchemy_entity.contents),
                phrase_layout_id=ULID.from_str(alchemy_entity.additional_data.get("phrase_layout_id")),
                title_layout_id=ULID.from_str(alchemy_entity.additional_data.get("title_layout_id"))
                if alchemy_entity.additional_data["title_layout_id"] is not None
                else None,
            )
        elif alchemy_entity.type == PartType.LYRICS:
            return LyricsPart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=LyricsContents(**alchemy_entity.contents),
                lyrics_layout_id=ULID.from_str(alchemy_entity.additional_data.get("lyrics_layout_id")),
                title_layout_id=ULID.from_str(alchemy_entity.additional_data.get("title_layout_id"))
                if alchemy_entity.additional_data["title_layout_id"] is not None
                else None,
            )
        elif alchemy_entity.type == PartType.PLAIN:
            return PlainPart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=PlainContents(**alchemy_entity.contents),
                layout_id=ULID.from_str(alchemy_entity.additional_data.get("layout_id")),
            )
        elif alchemy_entity.type == PartType.VALUE:
            return ValuePart(
                id=ULID.from_str(alchemy_entity.id),
                project_id=ULID.from_str(alchemy_entity.project_id),
                container_id=(
                    ULID.from_str(alchemy_entity.container_id) if alchemy_entity.container_id is not None else None
                ),
                order=alchemy_entity.order,
                contents=ValueContents(**alchemy_entity.contents),
                layout_id=ULID.from_str(alchemy_entity.additional_data.get("layout_id")),
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
            contents=domain_entity.contents.model_dump(),
            additional_data=domain_entity.model_dump(
                mode="json", exclude={"id", "project_id", "order", "type", "contents"}
            ),
        )
