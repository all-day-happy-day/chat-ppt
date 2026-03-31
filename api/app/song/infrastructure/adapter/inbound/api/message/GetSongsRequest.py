from pydantic import BaseModel


class GetSongsRequest(BaseModel):
    title: str
