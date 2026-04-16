from app.song.domain.entity import Song
from app.song.domain.repository import SongRepository


class ListAllSongsUseCase:
    def __init__(self, song_repository: SongRepository) -> None:
        self.song_repository: SongRepository = song_repository

    def __call__(self) -> list[Song]:
        return self.song_repository.list_all()
