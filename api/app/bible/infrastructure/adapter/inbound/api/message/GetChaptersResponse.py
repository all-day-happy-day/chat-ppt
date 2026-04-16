from pydantic import BaseModel


class GetChaptersResponse(BaseModel):
    chapters: list[int]
