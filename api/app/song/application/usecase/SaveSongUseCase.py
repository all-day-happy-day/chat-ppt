from datetime import datetime, timezone

from ulid import ULID

from app.shared.song.domain.valueobject import Lyrics, LyricsPart
from app.song.domain.entity import Song
from app.song.domain.exception import DuplicatedSong, SongNotFound
from app.song.domain.repository import LyricsRepository, SongRepository


class SaveSongUseCase:
    def __init__(self, song_repository: SongRepository, lyrics_repository: LyricsRepository) -> None:
        self.song_repository: SongRepository = song_repository
        self.lyrics_repository: LyricsRepository = lyrics_repository

    def __call__(
        self, user_id: ULID, title: str, artist: str | None, lyrics: list[LyricsPart], overwrite: bool = False
    ) -> tuple[Song, Lyrics]:
        try:
            song: Song = self.song_repository.get_by_title_and_artist(title=title, artist=artist)
            if not overwrite:
                raise DuplicatedSong(f"Song already exists: '{title}' by '{artist}'")
            else:
                self.song_repository.delete_by_id(song_id=song.id)
        except SongNotFound:
            pass

        now: datetime = datetime.now(tz=timezone.utc)
        song_entity: Song = Song(
            id=ULID(),
            title=title,
            artist=artist,
            user_id=user_id,
            created_at=now,
            updated_at=now,
        )
        lyrics_entity: Lyrics = Lyrics(song_id=song_entity.id, lyrics=lyrics)
        self.song_repository.save(song=song_entity)
        self.lyrics_repository.save(lyrics=lyrics_entity)
        return song_entity, lyrics_entity
