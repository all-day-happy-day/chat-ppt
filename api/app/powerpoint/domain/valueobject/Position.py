from pydantic import BaseModel


class Position(BaseModel):
    x: int
    y: int
    rotation: float
