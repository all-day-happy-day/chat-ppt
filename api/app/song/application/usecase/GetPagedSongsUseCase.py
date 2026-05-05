from app.shared.page import Page, PagingOptions
from app.song.domain.entity import Song
from app.song.domain.repository import SongRepository


class GetPagedSongsUseCase:
    def __init__(self, song_repository: SongRepository) -> None:
        self.song_repository: SongRepository = song_repository

    def __call__(self, paging_options: PagingOptions) -> Page[Song]:
        return self.song_repository.get_paged(paging_options=paging_options)
