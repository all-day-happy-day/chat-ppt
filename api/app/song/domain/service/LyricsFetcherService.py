import re
from abc import ABC, abstractmethod
from unicodedata import normalize


class LyricsFetcherService(ABC):
    @abstractmethod
    def fetch(self, title: str, artist: str | None) -> tuple[str, str, str]:
        raise NotImplementedError

    @staticmethod
    def strings_match(s1: str, s2: str) -> bool:
        # Equal
        if s1 == s2:
            return True
        # Either one is empty
        elif not s1 or not s2:
            return False
        # Contains, both ways
        elif s1 in s2 or s2 in s1:
            return True
        # Else(Not Equal)
        else:
            return False

    @staticmethod
    def process_string_for_comparison(s: str) -> str:
        s = s.strip()
        s = re.sub(pattern=r"\s+", repl="", string=s)
        s = s.casefold()
        s = normalize("NFKC", s)
        return s

    @staticmethod
    def process_string_for_comparison_only_letters(s: str) -> str:
        s = LyricsFetcherService.process_string_for_comparison(s=s)
        s = re.sub(pattern=r"[^a-zA-Z0-9\s\uac00-\ud7af]", repl="", string=s)
        return s

    @staticmethod
    def process_lyrics(lyrics_parsed: list[str]) -> list[str]:
        for i, lyric_line in enumerate(lyrics_parsed):
            lyrics_parsed[i] = lyric_line.strip()
        lyrics_parsed = [lyric_line for lyric_line in lyrics_parsed if lyric_line]
        return lyrics_parsed
