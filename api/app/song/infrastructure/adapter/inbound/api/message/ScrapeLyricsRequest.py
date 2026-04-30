from pydantic import BaseModel


class ScrapeLyricsRequest(BaseModel):
    title: str
    artist: str | None = None
    overwrite: bool = False
