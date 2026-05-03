from pydantic import BaseModel, Field


class ImageData(BaseModel):
    data: bytes
    ext: str
    byte_length: int = Field(default_factory=lambda data: len(data))
