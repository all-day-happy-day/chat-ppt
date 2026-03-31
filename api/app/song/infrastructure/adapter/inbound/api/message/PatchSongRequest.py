from pydantic import BaseModel, ConfigDict

from app.song.application.types import UnSet


class PatchSongRequest(BaseModel):
    title: str | UnSet = UnSet()
    artist: str | UnSet | None = UnSet()

    model_config = ConfigDict(arbitrary_types_allowed=True)
