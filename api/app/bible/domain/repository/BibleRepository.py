from abc import ABC, abstractmethod

from app.bible.domain.valueobject import BiblePhrase
from app.shared.bible.domain.enum import AvailableBibleVersions


class BibleRepository(ABC):
    @abstractmethod
    def get(self, version: AvailableBibleVersions, book: str, chapter: int, verse: int) -> BiblePhrase:
        raise NotImplementedError

    @abstractmethod
    def get_books(self, version: AvailableBibleVersions) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def get_chapters(self, version: AvailableBibleVersions, book: str) -> list[int]:
        raise NotImplementedError

    @abstractmethod
    def get_verses(self, version: AvailableBibleVersions, book: str, chapter: int) -> list[int]:
        raise NotImplementedError
