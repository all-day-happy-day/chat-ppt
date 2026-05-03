from datetime import timezone

from ulid import ULID

from app.song.domain.entity import Song
from app.song.infrastructure.respository.song.entity import SongAlchemyEntity


class SongMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: SongAlchemyEntity) -> Song:
        return Song(
            id=ULID.from_str(alchemy_entity.id),
            title=alchemy_entity.title,
            artist=alchemy_entity.artist,
            user_id=ULID.from_str(alchemy_entity.user_id),
            created_at=alchemy_entity.created_at.replace(tzinfo=timezone.utc),
            updated_at=alchemy_entity.updated_at.replace(tzinfo=timezone.utc),
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Song) -> SongAlchemyEntity:
        return SongAlchemyEntity(
            id=str(domain_entity.id),
            title=domain_entity.title,
            artist=domain_entity.artist,
            user_id=str(domain_entity.user_id),
            created_at=domain_entity.created_at,
            updated_at=domain_entity.updated_at,
        )
