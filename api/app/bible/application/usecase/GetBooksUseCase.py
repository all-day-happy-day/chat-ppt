from app.bible.domain.repository import BibleRepository
from app.shared.bible.domain.enum import AvailableBibleVersions


class GetBooksUseCase:
    def __init__(self, bible_repository: BibleRepository) -> None:
        self.bible_repository: BibleRepository = bible_repository

    def __call__(self, version: AvailableBibleVersions) -> list[str]:
        return self.bible_repository.get_books(version=version)
