import json
from pathlib import Path

from app.bible.application.types import JSONBibleData
from app.bible.domain.exception import PhraseNotFound
from app.bible.domain.repository import BibleRepository
from app.bible.domain.valueobject import AvailableBibleVersions, BiblePhrase
from app.config import config


class AlchemyBibleRepository(BibleRepository):
    def __init__(self) -> None:
        self.bible_data_path: Path = Path(config.bible_data_path)

    def get(self, version: AvailableBibleVersions, book: str, chapter: int, verse: int) -> BiblePhrase:
        with open(file=self.bible_data_path, mode="r", encoding="utf-8") as f:
            bible_data: dict[str, JSONBibleData] = json.load(fp=f)

            try:
                return BiblePhrase(
                    version=version,
                    book=book,
                    chapter=chapter,
                    verse=verse,
                    phrase=bible_data[version.value][book][str(chapter)][str(verse)],
                )
            except KeyError:
                raise PhraseNotFound(
                    f"Phrase not found for version: {version}, book: {book}, chapter: {chapter}, verse: {verse}"
                )
