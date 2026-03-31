from typing import TypeAlias

ChapterData: TypeAlias = dict[int, str]
BookData: TypeAlias = dict[int, ChapterData]
BibleData: TypeAlias = dict[str, BookData]

JSONChapterData: TypeAlias = dict[str, str]
JSONBookData: TypeAlias = dict[str, JSONChapterData]
JSONBibleData: TypeAlias = dict[str, JSONBookData]

__all__ = [
    "ChapterData",
    "BookData",
    "BibleData",
    "JSONChapterData",
    "JSONBookData",
    "JSONBibleData",
]
