from sqlalchemy.orm import Session
from ulid import ULID

from app.shared.song.domain.valueobject import Lyrics
from app.song.domain.exception import LyricsNotFound
from app.song.domain.repository import LyricsRepository
from app.song.infrastructure.respository.lyrics.entity import LyricsAlchemyEntity
from app.song.infrastructure.respository.lyrics.mapper import LyricsMapper


class AlchemyLyricsRepository(LyricsRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, lyrics: Lyrics) -> Lyrics:
        alchemy_entity: LyricsAlchemyEntity = LyricsMapper.to_alchemy_entity(lyrics)
        self.db.merge(alchemy_entity)
        self.db.commit()
        return lyrics

    def get_by_song_id(self, song_id: ULID) -> Lyrics:
        alchemy_entity: LyricsAlchemyEntity | None = (
            self.db.query(LyricsAlchemyEntity).filter(LyricsAlchemyEntity.song_id == str(song_id)).first()
        )
        if alchemy_entity is None:
            raise LyricsNotFound(f"Lyrics not found: {song_id}")
        return LyricsMapper.to_domain_entity(alchemy_entity)

    def delete_by_song_id(self, song_id: ULID) -> None:
        alchemy_entity: LyricsAlchemyEntity | None = (
            self.db.query(LyricsAlchemyEntity).filter(LyricsAlchemyEntity.song_id == str(song_id)).first()
        )
        if alchemy_entity is None:
            raise LyricsNotFound(f"Lyrics not found: {song_id}")
        self.db.delete(alchemy_entity)
        self.db.commit()
