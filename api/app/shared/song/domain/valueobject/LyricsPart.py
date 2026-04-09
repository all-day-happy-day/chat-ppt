from pydantic import BaseModel


class LyricsPart(BaseModel):
    part: str
    lyrics: str
