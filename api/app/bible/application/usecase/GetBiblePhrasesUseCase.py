from app.bible.application.command import GetBiblePhrasesCommand
from app.bible.domain.repository import BibleRepository
from app.bible.domain.valueobject import BiblePhrase


class GetBiblePhrasesUseCase:
    def __init__(self, bible_repository: BibleRepository) -> None:
        self.bible_repository: BibleRepository = bible_repository

    def __call__(self, commands: list[GetBiblePhrasesCommand]) -> list[BiblePhrase]:
        return [
            self.bible_repository.get(command.version, command.book, command.chapter, command.verse)
            for command in commands
        ]
