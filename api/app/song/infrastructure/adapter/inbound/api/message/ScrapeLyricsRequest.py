from pydantic import BaseModel
from ulid import ULID


class ScrapeLyricsRequest(BaseModel):
    title: str
    artist: str | None = None
    overwrite: bool = False
    user_id: ULID
