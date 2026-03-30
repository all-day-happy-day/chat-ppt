from app.bible.domain.repository import BibleRepository
from app.bible.domain.valueobject import AvailableBibleVersions, BiblePhrase


class GetBiblePhraseUseCase:
    def __init__(self, bible_repository: BibleRepository) -> None:
        self.bible_repository: BibleRepository = bible_repository

    def __call__(self, version: AvailableBibleVersions, book: str, chapter: int, verse: int) -> BiblePhrase:
        return self.bible_repository.get(version=version, book=book, chapter=chapter, verse=verse)
