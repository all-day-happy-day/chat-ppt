from pydantic import BaseModel


class Size(BaseModel):
    width: int
    height: int
