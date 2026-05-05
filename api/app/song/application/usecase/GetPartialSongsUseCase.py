from app.song.domain.entity import Song
from app.song.domain.repository import SongRepository


class GetPartialSongsUseCase:
    def __init__(self, song_repository: SongRepository) -> None:
        self.song_repository: SongRepository = song_repository

    def __call__(self, size: int) -> list[Song]:
        return self.song_repository.get_partial_ordered_by_title(size=size)
