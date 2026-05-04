from ulid import ULID

from app.song.domain.repository import LyricsRepository, SongRepository


class DeleteSongUseCase:
    def __init__(self, song_repository: SongRepository, lyrics_repository: LyricsRepository) -> None:
        self.song_repository: SongRepository = song_repository
        self.lyrics_repository: LyricsRepository = lyrics_repository

    def __call__(self, song_id: ULID) -> None:
        self.lyrics_repository.delete_by_song_id(song_id=song_id)
        self.song_repository.delete_by_id(song_id=song_id)
