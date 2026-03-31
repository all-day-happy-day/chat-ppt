from pydantic import BaseModel

from app.song.domain.entity import Song


class GetSongsResponse(BaseModel):
    songs: list[Song]
