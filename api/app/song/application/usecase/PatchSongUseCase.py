from ulid import ULID

from app.song.application.types import UnSet
from app.song.domain.entity import Song
from app.song.domain.repository import SongRepository


class PatchSongUseCase:
    def __init__(self, song_repository: SongRepository) -> None:
        self.song_repository: SongRepository = song_repository

    def __call__(self, song_id: ULID, title: str | UnSet, artist: str | UnSet | None) -> Song:
        song_entity: Song = self.song_repository.get_by_id(song_id=song_id)

        if not isinstance(title, UnSet):
            song_entity.title = title
        if not isinstance(artist, UnSet):
            song_entity.artist = artist

        return self.song_repository.save(song=song_entity)
