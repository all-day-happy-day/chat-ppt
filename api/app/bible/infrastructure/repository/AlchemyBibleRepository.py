import json
from pathlib import Path

from app.bible.application.types import BibleData
from app.bible.domain.exception import PhraseNotFound
from app.bible.domain.repository import BibleRepository
from app.bible.domain.valueobject import AvailableBibleVersions, BiblePhrase
from app.config import config


class AlchemyBibleRepository(BibleRepository):
    def __init__(self) -> None:
        self.bible_data_path: Path = Path(config.bible_data_path)

    def get(self, version: AvailableBibleVersions, book: str, chapter: int, verse: int) -> BiblePhrase:
        with open(file=self.bible_data_path, mode="r") as f:
            bible_data: dict[str, BibleData] = json.load(fp=f, encoding="utf-8")

            try:
                return BiblePhrase(
                    version=version,
                    book=book,
                    chapter=chapter,
                    verse=verse,
                    phrase=bible_data[version.value][book][chapter][verse],
                )
            except KeyError:
                raise PhraseNotFound(
                    f"Phrase not found for version: {version}, book: {book}, chapter: {chapter}, verse: {verse}"
                )
