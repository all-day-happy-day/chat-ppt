from typing import TypeAlias

ChapterData: TypeAlias = dict[int, str]
BookData: TypeAlias = dict[int, ChapterData]
BibleData: TypeAlias = dict[str, BookData]


__all__ = [
    "ChapterData",
    "BookData",
    "BibleData",
]
