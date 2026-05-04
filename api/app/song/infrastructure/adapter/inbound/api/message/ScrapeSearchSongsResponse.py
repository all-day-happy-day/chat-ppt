from pydantic import BaseModel


class ScrapeSearchSongsResponse(BaseModel):
    songs: list[tuple[str, str, str | None]]
    page: int
    size: int
