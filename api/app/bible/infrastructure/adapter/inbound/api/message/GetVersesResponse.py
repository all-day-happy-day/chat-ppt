from pydantic import BaseModel


class GetVersesResponse(BaseModel):
    verses: list[int]
