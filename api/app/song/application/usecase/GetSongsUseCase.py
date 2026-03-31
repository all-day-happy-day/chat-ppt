from app.song.domain.entity import Song
from app.song.domain.exception import SongNotFound
from app.song.domain.repository import SongRepository


class GetSongsUseCase:
    def __init__(self, song_repository: SongRepository) -> None:
        self.song_repository: SongRepository = song_repository

    def __call__(self, title: str) -> list[Song]:
        try:
            return self.song_repository.get_by_title(title=title)
        except SongNotFound:
            return []
