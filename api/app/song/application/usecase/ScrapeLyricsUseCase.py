from app.shared.song.domain.valueobject import LyricsPart
from app.song.domain.service import LyricsFetcherService


class ScrapeLyricsUseCase:
    def __init__(self, lyrics_fetcher_service: LyricsFetcherService) -> None:
        self.lyrics_fetcher_service: LyricsFetcherService = lyrics_fetcher_service

    def __call__(self, title: str, artist: str | None = None) -> tuple[str, str, list[LyricsPart]]:
        _, artist_found, lyrics_text = self.lyrics_fetcher_service.fetch(title=title, artist=artist)
        lyrics_parts: list[LyricsPart] = [LyricsPart(part="Default", lyrics=lyrics_text)]

        return title, artist_found, lyrics_parts
