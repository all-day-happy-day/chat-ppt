from pydantic import BaseModel

from app.song.domain.entity import Song


class PatchSongResponse(BaseModel):
    song: Song
