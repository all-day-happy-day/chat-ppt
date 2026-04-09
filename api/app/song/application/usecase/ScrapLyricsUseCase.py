from ulid import ULID

from app.shared.song.domain.valueobject import Lyrics, LyricsPart
from app.song.domain.entity import Song
from app.song.domain.exception import DuplicatedSong, SongNotFound
from app.song.domain.repository import LyricsRepository, SongRepository
from app.song.domain.service import LyricsFetcherService


class ScrapLyricsUseCase:
    def __init__(
        self,
        lyrics_repository: LyricsRepository,
        song_repository: SongRepository,
        lyrics_fetcher_service: LyricsFetcherService,
    ) -> None:
        self.lyrics_repository: LyricsRepository = lyrics_repository
        self.song_repository: SongRepository = song_repository
        self.lyrics_fetcher_service: LyricsFetcherService = lyrics_fetcher_service

    def __call__(self, title: str, artist: str | None, overwrite: bool = False) -> tuple[Song, Lyrics]:
        try:
            song: Song = self.song_repository.get_by_title_and_artist(title=title, artist=artist)
            if not overwrite:
                raise DuplicatedSong(f"Song already exists: '{title}' by '{artist}'")
            else:
                self.song_repository.delete_by_id(song_id=song.id)
        except SongNotFound:
            pass

        _, artist_found, lyrics_text = self.lyrics_fetcher_service.fetch(title=title, artist=artist)

        song_entity: Song = Song(id=ULID(), title=title, artist=artist if artist else artist_found)
        self.song_repository.save(song=song_entity)

        lyrics_entity: Lyrics = Lyrics(song_id=song_entity.id, lyrics=[LyricsPart(part="Default", lyrics=lyrics_text)])
        self.lyrics_repository.save(lyrics=lyrics_entity)

        return song_entity, lyrics_entity
