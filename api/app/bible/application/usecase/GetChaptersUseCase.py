from app.bible.domain.repository import BibleRepository
from app.shared.bible.domain.enum import AvailableBibleVersions


class GetChaptersUseCase:
    def __init__(self, bible_repository: BibleRepository) -> None:
        self.bible_repository: BibleRepository = bible_repository

    def __call__(self, version: AvailableBibleVersions, book: str) -> list[int]:
        return self.bible_repository.get_chapters(version=version, book=book)
