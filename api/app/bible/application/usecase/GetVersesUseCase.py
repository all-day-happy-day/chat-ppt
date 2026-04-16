from app.bible.domain.repository import BibleRepository
from app.shared.bible.domain.enum import AvailableBibleVersions


class GetVersesUseCase:
    def __init__(self, bible_repository: BibleRepository) -> None:
        self.bible_repository: BibleRepository = bible_repository

    def __call__(self, version: AvailableBibleVersions, book: str, chapter: int) -> list[int]:
        return self.bible_repository.get_verses(version=version, book=book, chapter=chapter)
