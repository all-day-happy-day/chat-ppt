from ulid import ULID

from app.song.infrastructure.respository.lyrics.entity import LyricsAlchemyEntity
from core.shared.song.domain.valueobject import Lyrics, LyricsPart


class LyricsMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: LyricsAlchemyEntity) -> Lyrics:
        return Lyrics(
            song_id=ULID.from_str(alchemy_entity.song_id),
            lyrics=[LyricsPart(**lyric) for lyric in alchemy_entity.lyrics],
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Lyrics) -> LyricsAlchemyEntity:
        return LyricsAlchemyEntity(
            song_id=str(domain_entity.song_id),
            lyrics=[lyric.model_dump() for lyric in domain_entity.lyrics],
        )
