from sqlalchemy.orm import Session
from ulid import ULID

from app.song.domain.entity import Song
from app.song.domain.exception import SongNotFound
from app.song.domain.repository import SongRespository
from app.song.infrastructure.respository.song.entity import SongAlchemyEntity
from app.song.infrastructure.respository.song.mapper import SongMapper


class AlchemySongRepository(SongRespository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, song: Song) -> Song:
        alchemy_entity: SongAlchemyEntity = SongMapper.to_alchemy_entity(song)
        merged_entity: SongAlchemyEntity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(merged_entity)
        return SongMapper.to_domain_entity(merged_entity)

    def get_by_title(self, title: str) -> list[Song]:
        alchemy_entities: list[SongAlchemyEntity] = (
            self.db.query(SongAlchemyEntity).filter(SongAlchemyEntity.title == title).all()
        )
        return [SongMapper.to_domain_entity(entity) for entity in alchemy_entities]

    def get_by_id(self, song_id: ULID) -> Song:
        alchemy_entity: SongAlchemyEntity | None = (
            self.db.query(SongAlchemyEntity).filter(SongAlchemyEntity.id == str(song_id)).first()
        )
        if alchemy_entity is None:
            raise SongNotFound(f"Song not found: {song_id}")
        return SongMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, song_id: ULID) -> None:
        alchemy_entity: SongAlchemyEntity | None = (
            self.db.query(SongAlchemyEntity).filter(SongAlchemyEntity.id == str(song_id)).first()
        )
        if alchemy_entity is None:
            raise SongNotFound(f"Song not found: {song_id}")
        self.db.delete(alchemy_entity)
        self.db.commit()
