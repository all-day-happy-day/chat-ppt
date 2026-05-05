from app.song.domain.service import LyricsFetcherService


class ScrapeSearchSongsUseCase:
    def __init__(self, lyrics_fetcher_service: LyricsFetcherService) -> None:
        self.lyrics_fetcher_service: LyricsFetcherService = lyrics_fetcher_service

    def __call__(self, title: str, artist: str | None, page: int = 1) -> list[tuple[str, str, str | None]]:
        return self.lyrics_fetcher_service.search(title=title, artist=artist, page=page)
