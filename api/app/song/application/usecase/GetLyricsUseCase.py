from ulid import ULID

from app.song.domain.entity import Song
from app.song.domain.repository import LyricsRepository, SongRepository
from core.shared.song.domain.valueobject import Lyrics


class GetLyricsUseCase:
    def __init__(self, lyrics_repository: LyricsRepository, song_repository: SongRepository) -> None:
        self.lyrics_repository: LyricsRepository = lyrics_repository
        self.song_repository: SongRepository = song_repository

    def __call__(self, song_id: ULID) -> tuple[Song, Lyrics]:
        return self.song_repository.get_by_id(song_id=song_id), self.lyrics_repository.get_by_song_id(song_id=song_id)
