import json
from pathlib import Path

from app.bible.application.types import JSONBibleData
from app.bible.domain.exception import BookNotFound, ChapterNotFound, PhraseNotFound, UnsupportedVersion
from app.bible.domain.repository import BibleRepository
from app.bible.domain.valueobject import BiblePhrase
from app.config import config
from app.shared.bible.domain.enum import AvailableBibleVersions


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
            except KeyError as e:
                if bible_data.get(version.value) is None:
                    raise UnsupportedVersion(f"Version not found: {version}")
                elif bible_data[version.value].get(book) is None:
                    raise BookNotFound(f"Book not found: {book}")
                elif bible_data[version.value][book].get(str(chapter)) is None:
                    raise ChapterNotFound(f"Chapter not found: {chapter}")
                elif bible_data[version.value][book][str(chapter)].get(str(verse)) is None:
                    raise PhraseNotFound(f"Phrase not found: {verse}")
                else:
                    raise e

    def get_books(self, version: AvailableBibleVersions) -> list[str]:
        with open(file=self.bible_data_path, mode="r", encoding="utf-8") as f:
            bible_data: dict[str, JSONBibleData] = json.load(fp=f)
            return list(bible_data[version.value].keys())

    def get_chapters(self, version: AvailableBibleVersions, book: str) -> list[int]:
        with open(file=self.bible_data_path, mode="r", encoding="utf-8") as f:
            bible_data: dict[str, JSONBibleData] = json.load(fp=f)
            return list(map(int, bible_data[version.value][book].keys()))

    def get_verses(self, version: AvailableBibleVersions, book: str, chapter: int) -> list[int]:
        with open(file=self.bible_data_path, mode="r", encoding="utf-8") as f:
            bible_data: dict[str, JSONBibleData] = json.load(fp=f)
            return list(map(int, bible_data[version.value][book][str(chapter)].keys()))
