from pydantic import BaseModel


class ImageData(BaseModel):
    data: str
    # ext: str
    byte_length: int
