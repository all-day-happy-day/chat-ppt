from pydantic import BaseModel


class ScrapLyricsRequest(BaseModel):
    title: str
    artist: str | None
    overwrite: bool = False
