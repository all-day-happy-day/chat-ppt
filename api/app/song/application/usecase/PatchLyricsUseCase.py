from ulid import ULID

from app.song.domain.repository import LyricsRepository
from app.song.domain.valueobject import Lyrics, LyricsPart


class PatchLyricsUseCase:
    def __init__(self, lyrics_repository: LyricsRepository) -> None:
        self.lyrics_repository: LyricsRepository = lyrics_repository

    def __call__(self, song_id: ULID, lyrics: list[LyricsPart]) -> Lyrics:
        return self.lyrics_repository.save(lyrics=Lyrics(song_id=song_id, lyrics=lyrics))
