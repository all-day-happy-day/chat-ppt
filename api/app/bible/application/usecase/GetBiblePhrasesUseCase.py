from app.bible.domain.repository import BibleRepository
from app.bible.domain.service import ParseVerseQueryService as P
from app.bible.domain.valueobject import BiblePhrase, BibleVerseQuery
from app.shared.bible.domain.enum import AvailableBibleVersions


class GetBiblePhrasesUseCase:
    def __init__(self, bible_repository: BibleRepository) -> None:
        self.bible_repository: BibleRepository = bible_repository
        self.parse_verse_query_service: P.ParseVerseQueryService = P.ParseVerseQueryService()

    def __call__(self, version: AvailableBibleVersions, book: str, chapter: str, verse: str) -> list[BiblePhrase]:
        verse_query: BibleVerseQuery = BibleVerseQuery(version=version, book=book, chapter=chapter, verse=verse)
        queries: list[BibleVerseQuery] = self.parse_verse_query_service.parse(verse_query=verse_query)
        return [
            self.bible_repository.get(
                version=query.version,
                book=query.book,
                chapter=int(query.chapter),
                verse=int(query.verse),
            )
            for query in queries
        ]
