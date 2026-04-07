from abc import ABC, abstractmethod

from app.bible.domain.valueobject import BiblePhrase
from core.shared.bible.domain.enum import AvailableBibleVersions


class BibleRepository(ABC):
    @abstractmethod
    def get(self, version: AvailableBibleVersions, book: str, chapter: int, verse: int) -> BiblePhrase:
        raise NotImplementedError
