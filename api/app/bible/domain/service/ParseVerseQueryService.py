from ..valueobject.BibleVerseQuery import BibleVerseQuery
from .ParseVerseRangeService import ParseVerseRangeService


class ParseVerseQueryService:
    def __init__(self) -> None:
        self.parse_verse_range_service: ParseVerseRangeService = ParseVerseRangeService()

    def parse(self, verse_query: BibleVerseQuery) -> list[BibleVerseQuery]:
        verses: list[int] = self.parse_verse_range_service.parse(verse=verse_query.verse)
        queries: list[BibleVerseQuery] = [verse_query.model_copy(update={"verse": verse}) for verse in verses]
        return queries
