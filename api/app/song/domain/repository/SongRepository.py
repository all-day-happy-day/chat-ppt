from abc import ABC, abstractmethod

from ulid import ULID

from app.shared.page import Page, PagingOptions
from app.song.domain.entity import Song


class SongRepository(ABC):
    @abstractmethod
    def save(self, song: Song) -> Song:
        raise NotImplementedError

    @abstractmethod
    def get_by_title(self, title: str) -> list[Song]:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Song]:
        raise NotImplementedError

    @abstractmethod
    def get_by_title_and_artist(self, title: str, artist: str | None) -> Song:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, song_id: ULID) -> Song:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, song_id: ULID) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_paged(self, paging_options: PagingOptions) -> Page[Song]:
        raise NotImplementedError

    @abstractmethod
    def get_partial_ordered_by_title(self, size: int) -> list[Song]:
        raise NotImplementedError
