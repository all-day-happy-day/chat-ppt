from pydantic import BaseModel


class GetBooksResponse(BaseModel):
    books: list[str]
