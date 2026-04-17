import re

from app.bible.domain.exception import MultipleNumbers, MultipleSeparators, UnsupportedLetter


class ParseVerseRangeService:
    SEP: list[str] = ["-", "~", ","]

    def parse(self, verse: str) -> list[int]:
        # Find unsupported letters
        survived: list[str] = re.compile(f"[0-9{''.join(self.SEP)}]").findall(verse)
        if len(survived) != len(verse):
            raise UnsupportedLetter(f"Unsupported letter: {verse}")

        # Find multiple separators
        seps: list[str] = re.compile(f"[{''.join(self.SEP)}]").findall(verse)
        if len(seps) > 1:
            raise MultipleSeparators(f"Multiple separators: {verse}")

        # Parse
        numbers: list[int] = re.compile(r"[0-9]+").findall(verse)
        if seps:
            if seps[0] in self.SEP[0:2]:  # range
                if len(numbers) != 2:
                    raise MultipleNumbers(f"Multiple numbers: {verse}")
                st: int = int(numbers[0])
                en: int = int(numbers[1])
                return list(range(st, en + 1))
            elif seps[0] == self.SEP[2]:  # comma
                return [int(number) for number in numbers]
            else:
                raise NotImplementedError
        else:
            return [int(number) for number in numbers]
