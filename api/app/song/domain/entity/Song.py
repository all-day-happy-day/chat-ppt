from datetime import datetime

from pydantic import BaseModel, Field
from ulid import ULID


class Song(BaseModel):
    id: ULID = Field(default_factory=lambda: ULID())
    title: str
    artist: str | None = None
    user_id: ULID
    created_at: datetime
    updated_at: datetime
