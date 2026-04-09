from abc import ABC, abstractmethod

from ulid import ULID

from app.shared.song.domain.valueobject import Lyrics


class LyricsRepository(ABC):
    @abstractmethod
    def save(self, lyrics: Lyrics) -> Lyrics:
        raise NotImplementedError

    @abstractmethod
    def get_by_song_id(self, song_id: ULID) -> Lyrics:
        raise NotImplementedError

    @abstractmethod
    def delete_by_song_id(self, song_id: ULID) -> None:
        raise NotImplementedError
